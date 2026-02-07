import argparse

from lib.keyword_search import (
    build_command,
    search_command,
    InvertedIndex,
    tokenize_text,
    bm25_idf_command,
    bm25_tf_command,
    BM25_K1,
    BM25_B

)
import sys
import math

def main() -> None:
    parser = argparse.ArgumentParser(description="Keyword Search CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    subparsers.add_parser("build", help="Build the inverted index")

    tf_parser = subparsers.add_parser("tf", help="Get Term Frequency for a token in a document")
    tf_parser.add_argument("doc_id", type=int, help="Document ID (integer) to check.") # Note: type=int is important
    tf_parser.add_argument("term", type=str, help="Term (single word) to count.")

    idf_parser = subparsers.add_parser("idf", help="Get inverse term frequency for any token")
    idf_parser.add_argument("term", type=str, help="Token to check idf for")

    tfidf_parser = subparsers.add_parser("tfidf", help="Get tfidf score for a search term for a movie")
    tfidf_parser.add_argument("doc_id", type=int, help="document id of the movie you want to check for")
    tfidf_parser.add_argument("term", type=str, help="Token to check idf for")

    bm25_idf_parser = subparsers.add_parser('bm25idf', help="Get BM25 IDF score for a given term")
    bm25_idf_parser.add_argument("term", type=str, help="Term to get BM25 IDF score for")

    bm25_tf_parser = subparsers.add_parser("bm25tf", help="Get BM25 TF score for a given document ID and term")
    bm25_tf_parser.add_argument("doc_id", type=int, help="Document ID")
    bm25_tf_parser.add_argument("term", type=str, help="Term to get BM25 TF score for")
    bm25_tf_parser.add_argument("K1", type=float, nargs='?', default=BM25_K1, help="Tunable BM25 K1 parameter")
    bm25_tf_parser.add_argument("b", type=float, nargs='?', default=BM25_B, help="Tunable BM25 b parameter")

    bm25search_parser = subparsers.add_parser("bm25search", help="Search movies using full BM25 scoring")
    bm25search_parser.add_argument("query", type=str, help="Search query")
    bm25search_parser.add_argument("--limit", type=int, default=5, help="Maximum number of results to return (default: 5)")

    search_parser = subparsers.add_parser("search", help="Search movies using BM25")
    search_parser.add_argument("query", type=str, help="Search query")

    args = parser.parse_args()

    match args.command:

        case "build":
            print("Building inverted index...")
            build_command()
            print("Inverted index built successfully.")
        case "search":
            print("Searching for:", args.query)
            results = search_command(args.query)
            for i, res in enumerate(results, 1):
                print(f"{i}. ({res['id']}) {res['title']}")
        case "tf":
            # Load the index (with error handling)
            index = InvertedIndex()
            try:
                index.load()
            except FileNotFoundError:
                print(f"Error: Index files not found. Please run the 'build' command first.")
                sys.exit(1)
            
            # Get the arguments from argparse
            doc_id = args.doc_id
            term = args.term
            
            try:
                # Call the new method to get the Term Frequency (TF)
                tf_count = index.get_tf(doc_id, term)
                
                # Print the count. If the term wasn't found in the doc, get_tf returns 0.
                print(tf_count)
                
            except ValueError as e:
                # Handles the exception if the user provides a multi-word term
                print(f"Error: {e}")
                sys.exit(1)

        case "idf": 
            index = InvertedIndex
            try:
                index.load()
                idf, processed_term = index.get_idf(args.term)
                print(f"Inverse document frequency of '{args.term}' (as '{processed_term}'): {idf:.2f}")
            except (FileNotFoundError, ValueError) as e:
                print(f"Error: {e}")
                return

        case "tfidf":
            index = InvertedIndex()
            try:
                index.load()
                tf = index.get_tf(args.doc_id, args.term)
                idf, _ = index.get_idf(args.term)

                tf_idf = tf * idf
                print(f"TF-IDF score of '{args.term}' in document '{args.doc_id}': {tf_idf:.2f}")

            except (FileNotFoundError, ValueError) as e:
                print(f"Error: {e}")
                return

        case "bm25idf":
            try:
                bm25idf = bm25_idf_command(args.term)
                print(f"BM25 IDF score of '{args.term}': {bm25idf:.2f}")
            except (FileNotFoundError, ValueError) as e:
                print(f"Error: {e}")
                return

        case "bm25tf":
            try:
                bm25tf = bm25_tf_command(args.doc_id, args.term, args.K1)
                print(f"BM25 TF score of '{args.term}' in document '{args.doc_id}': {bm25tf:.2f}")
            except (FileNotFoundError, ValueError) as e:
                print(f"Error: {e}")
                return

        case "bm25search":
            try:
                index = InvertedIndex()
                index.load()
                results = index.bm25_search(args.query, limit=args.limit)
        
                for i, result in enumerate(results, 1):
                    doc_id = result["id"]
                    title = result["title"]
                    score = result["bm25_score"]
                    print(f"{i}. ({doc_id}) {title} - Score: {score:.2f}")
            
            except (FileNotFoundError, ValueError) as e:
                print(f"Error: {e}")
                return

        case _:
            parser.exit(2, parser.format_help())


if __name__ == "__main__":
    main()
