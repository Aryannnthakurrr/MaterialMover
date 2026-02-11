import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useToast } from '../components/Toast';
import { getToken, getRole, checkTokenExpiry, formatPrice, getAuthHeaders } from '../utils/auth';
import '../styles/seller.css';
import '../styles/earth-scroll.css';

export default function Seller() {
  const toast = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
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

  // Apply dark theme
  useEffect(() => {
    document.body.classList.add('earth-scroll-page');
    return () => document.body.classList.remove('earth-scroll-page');
  }, []);

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
      if (!resp.ok) {
        const error = await resp.json();
        console.error('Error response:', error);
        toast.error(error.message || 'Failed to load products');
        return;
      }
      const data = await resp.json();
      console.log('Loading products:', data);
      setProducts(data.products || []);
    } catch (err) {
      console.error('Error loading products:', err);
      toast.error('Error loading products');
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
    setShowForm(false);
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
      setPhoneNo(product.phone_no || '');

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
      setShowForm(true);
      toast.info('✏️ Editing product');
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
        setUploadedImagePath(result.url);
        setImageUrl('');
        toast.success('Image uploaded to Cloudinary successfully');
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
        toast.success(currentEditId ? '✅ Product updated' : '✅ Product created');
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
    const confirmed = window.confirm('Are you sure you want to delete this product?');
    if (!confirmed) {
      toast.info('Deletion cancelled');
      return;
    }
    try {
      console.log('Deleting product with id:', id);
      const resp = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + getToken() },
      });

      if (!resp.ok) {
        const data = await resp.json();
        toast.error(data.message || 'Error deleting product');
        return;
      }

      toast.success('✅ Product deleted');
      // Reload products from server
      await loadMyProducts();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Error deleting product. Please try again.');
    }
  }

  return (
    <>
      <Header />

      <main className="seller-container">
        <div className="seller-header">
          <div className="seller-header-content">
            <h2>📦 Seller Dashboard</h2>
            <p>Manage and list your construction materials</p>
          </div>
          <button
            className="btn-add-product"
            onClick={() => {
              if (!showForm) {
                resetForm();
                setShowForm(true);
              }
            }}
          >
            ➕ Add New Product
          </button>
        </div>

        <div className="seller-content">
          {showForm && (
            <div className="seller-form-section">
              <div className="form-header">
                <h3>{currentEditId ? '✏️ Edit Product' : '🆕 Add New Product'}</h3>
                <button className="btn-close" onClick={resetForm}>✕</button>
              </div>

              <form id="createForm" onSubmit={handleSubmit} className="seller-form">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label htmlFor="title">Product Title *</label>
                    <input
                      id="title"
                      type="text"
                      placeholder="e.g., Premium Cement Bags (50kg)"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="desc">Short Description *</label>
                    <input
                      id="desc"
                      type="text"
                      placeholder="e.g., High quality OPC cement, ready for delivery"
                      required
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="category">Category *</label>
                    <select
                      id="category"
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="price">Price (₹) *</label>
                    <input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="quantity">Quantity *</label>
                    <input
                      id="quantity"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="address">Location *</label>
                    <input
                      id="address"
                      type="text"
                      placeholder="e.g., New Delhi"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="phoneNo">Contact Number *</label>
                    <input
                      id="phoneNo"
                      type="tel"
                      placeholder="e.g., +91 98765 43210"
                      required
                      value={phoneNo}
                      onChange={(e) => setPhoneNo(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Product Image</label>
                    <div className="image-upload-area">
                      <div className="upload-input-group">
                        <input
                          type="file"
                          id="imageFile"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="file-input"
                        />
                        <label htmlFor="imageFile" className="file-label">
                          📥 Choose Image
                        </label>
                      </div>
                      <span className="divider">or</span>
                      <input
                        id="imageUrl"
                        type="url"
                        placeholder="Paste image URL"
                        value={imageUrl}
                        onChange={handleImageUrlChange}
                        className="form-input url-input"
                      />

                      {imagePreviewSrc && (
                        <div className="image-preview-container">
                          <img src={imagePreviewSrc} alt="Preview" className="image-preview" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-submit">
                    {currentEditId ? '💾 Update Product' : '➕ Add Product'}
                  </button>
                  <button type="button" className="btn-cancel" onClick={resetForm}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="seller-products-section">
            <div className="products-header">
              <h3>📋 My Products ({products.length})</h3>
            </div>

            {products.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h4>No products yet</h4>
                <p>Start selling by adding your first product</p>
                <button
                  className="btn-add-product"
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                >
                  Add Your First Product
                </button>
              </div>
            ) : (
              <div className="products-grid">
                {products.map((product) => (
                  <div className="product-card" key={product._id || product.id}>
                    <div className="product-image">
                      <img
                        src={product.image || '/images/placeholder.png'}
                        alt={product.title}
                      />
                      <span className="product-category">{product.category}</span>
                    </div>

                    <div className="product-details">
                      <h4>{product.title}</h4>
                      <p className="description">{product.description}</p>

                      <div className="product-meta">
                        <div className="meta-item">
                          <span className="label">Quantity:</span>
                          <span className="value">{product.quantity} units</span>
                        </div>
                        <div className="meta-item">
                          <span className="label">Location:</span>
                          <span className="value">{product.address}</span>
                        </div>
                      </div>

                      <div className="product-footer">
                        <div className="price">{formatPrice(product.price)}</div>
                        <div className="product-actions">
                          <button
                            className="btn-icon edit"
                            onClick={() => handleEditProduct(product._id || product.id)}
                            title="Edit product"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn-icon delete"
                            onClick={() => handleDeleteProduct(product._id || product.id)}
                            title="Delete product"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
