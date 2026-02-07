import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { getToken, getRole, checkTokenExpiry, formatPrice, getAuthHeaders } from '../utils/auth';

export default function Seller() {
  const toast = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [uploadedImagePath, setUploadedImagePath] = useState('');
  const [imagePreviewSrc, setImagePreviewSrc] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (!getToken() || getRole() !== 'seller') {
      toast.error('Please login as seller');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }
    if (!checkTokenExpiry()) {
      toast.error('Session expired. Please login again.');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }
    loadCategories();
    loadMyProducts();
  }, []);

  async function loadCategories() {
    try {
      const response = await fetch('/api/products/categories', {
        headers: { Authorization: 'Bearer ' + getToken() },
      });
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }

  async function loadMyProducts() {
    try {
      const resp = await fetch('/api/products/my', {
        headers: { Authorization: 'Bearer ' + getToken() },
      });
      const data = await resp.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Error loading products:', err);
    }
  }

  function resetForm() {
    setTitle('');
    setDesc('');
    setCategory('');
    setPrice('');
    setQuantity('');
    setAddress('');
    setPhoneNo('');
    setImageUrl('');
    setUploadedImagePath('');
    setImagePreviewSrc('');
    setCurrentEditId(null);
  }

  async function handleEditProduct(id) {
    try {
      const resp = await fetch(`/api/products/${id}`, {
        headers: { Authorization: 'Bearer ' + getToken() },
      });
      if (!resp.ok) {
        const err = await resp.json();
        toast.error(err.message || 'Unable to load product');
        return;
      }
      const payload = await resp.json();
      const product = payload.product || payload;

      setTitle(product.title || '');
      setDesc(product.description || '');
      setPrice(product.price ?? '');
      setQuantity(product.quantity ?? '');
      setCategory(product.category || '');
      setAddress(product.address || '');
      setPhoneNo(product.phone_number || '');

      if (product.image) {
        setImagePreviewSrc(product.image);
        setImageUrl(product.image);
        setUploadedImagePath(product.image);
      } else {
        setImagePreviewSrc('');
        setImageUrl('');
        setUploadedImagePath('');
      }

      setCurrentEditId(id);
      toast.info('Editing product — make changes and click Update');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error fetching product for edit', err);
      toast.error('Error loading product');
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreviewSrc(ev.target.result);
    reader.readAsDataURL(file);

    // Upload file
    const formData = new FormData();
    formData.append('image', file);

    try {
      const resp = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + getToken() },
        body: formData,
      });
      const result = await resp.json();
      if (resp.ok) {
        setUploadedImagePath(result.path);
        setImageUrl('');
        toast.success('Image uploaded successfully');
      } else {
        toast.error('Upload failed: ' + result.message);
      }
    } catch (err) {
      toast.error('Upload error: ' + err.message);
    }
  }

  function handleImageUrlChange(e) {
    const url = e.target.value;
    setImageUrl(url);
    if (url) {
      setImagePreviewSrc(url);
      setUploadedImagePath(url);
    } else {
      setImagePreviewSrc('');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!checkTokenExpiry()) {
      toast.error('Session expired. Please login again.');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    if (!title.trim() || !desc.trim() || !price || !quantity || !category || !address.trim() || !phoneNo.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const priceNum = parseFloat(price);
    const quantityNum = parseInt(quantity);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error('Please enter a valid price (must be 0 or greater)');
      return;
    }
    if (isNaN(quantityNum) || quantityNum < 0) {
      toast.error('Please enter a valid quantity (must be 0 or greater)');
      return;
    }

    const endpoint = currentEditId ? `/api/products/${currentEditId}` : '/api/products';
    const method = currentEditId ? 'PUT' : 'POST';

    try {
      const resp = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          description: desc.trim(),
          price: priceNum,
          quantity: quantityNum,
          category,
          address: address.trim(),
          phone_no: phoneNo.trim(),
          image: uploadedImagePath || imageUrl,
        }),
      });
      const data = await resp.json();
      if (resp.ok) {
        toast.success(currentEditId ? 'Product updated successfully' : 'Product created successfully');
        resetForm();
        loadMyProducts();
      } else {
        const errorMessage = data.details ? data.details.join('\n') : data.message || 'Error creating product';
        toast.error(errorMessage);
      }
    } catch (err) {
      console.error('Error creating product:', err);
      toast.error('Error creating product. Please try again.');
    }
  }

  async function handleDeleteProduct(id) {
    const confirmed = await toast.showConfirm('🗑️ Are you sure you want to delete this product?');
    if (!confirmed) {
      toast.info('Deletion cancelled');
      return;
    }
    try {
      const resp = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + getToken() },
      });
      const data = await resp.json();
      if (resp.ok) {
        toast.success('✅ Product deleted successfully');
        loadMyProducts();
      } else {
        toast.error(data.message || 'Error deleting product');
      }
    } catch (err) {
      toast.error('Error deleting product. Please try again.');
    }
  }

  function handleLogout(e) {
    e.preventDefault();
    localStorage.clear();
    toast.info('🔒 Logged out');
    setTimeout(() => navigate('/'), 1000);
  }

  return (
    <>
      <header className="site-header">
        <h1>Seller Dashboard</h1>
        <nav>
          <Link to="/">Home</Link>
          <span id="userInfo">
            <span id="userEmail">{localStorage.getItem('email')}</span>
            <a id="logout" href="#" onClick={handleLogout}>
              Logout
            </a>
          </span>
        </nav>
      </header>

      <main className="container">
        <section className="seller-panel">
          <div className="product-form">
            <h3>Add Product</h3>
            <form id="createForm" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  id="title"
                  className="older-box"
                  type="text"
                  placeholder="Enter product title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="desc">Description *</label>
                <input
                  id="desc"
                  className="older-box"
                  type="text"
                  placeholder="Short description"
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Category *</label>
                  <select id="category" required value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="price">Price * (₹)</label>
                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter price"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="quantity">Quantity *</label>
                  <input
                    id="quantity"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Available quantity"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="address">Address *</label>
                  <input
                    id="address"
                    type="text"
                    placeholder="Enter pickup address"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone_no">Phone Number *</label>
                  <input
                    id="phone_no"
                    type="tel"
                    placeholder="Enter contact number"
                    required
                    value={phoneNo}
                    onChange={(e) => setPhoneNo(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Product Image</label>
                  <div className="image-upload">
                    <div className="upload-placeholder">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p>Drag and drop an image or click to browse</p>
                    </div>
                    <input type="file" id="imageFile" accept="image/*" onChange={handleFileChange} />
                    <span>or</span>
                    <input
                      id="imageUrl"
                      type="url"
                      placeholder="Paste an image URL"
                      value={imageUrl}
                      onChange={handleImageUrlChange}
                    />
                    <div id="imagePreview" className="image-preview">
                      {imagePreviewSrc && <img src={imagePreviewSrc} alt="Preview" />}
                    </div>
                  </div>
                </div>
              </div>
              <button type="submit">{currentEditId ? 'Update Product' : 'Create Product'}</button>
            </form>
          </div>

          <div className="my-products">
            <h3>My Products</h3>
            <div id="myProducts" className="simple-product-list">
              {products.length === 0 ? (
                <div className="products-empty">No products added yet</div>
              ) : (
                products.map((product) => (
                  <div className="simple-item" key={product._id}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <img
                        className="thumb"
                        src={product.image || '/images/placeholder.png'}
                        alt={product.title}
                      />
                      <div className="meta">
                        <div>
                          <div className="title">{product.title}</div>
                          <div className="category">{product.category || ''}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="price">{formatPrice(product.price)}</div>
                      <div className="quantity">Qty: {product.quantity}</div>
                      <div className="actions">
                        <button onClick={() => handleEditProduct(product._id)}>Edit</button>
                        <button onClick={() => handleDeleteProduct(product._id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
