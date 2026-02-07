class Toast {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }

  show(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '✓' :
                 type === 'error' ? '✕' : 'ℹ';
    
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-message">${message}</div>
      <button class="toast-close">×</button>
    `;

    this.container.appendChild(toast);

    // Add close button functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.close(toast));

    // Auto remove after 5 seconds
    setTimeout(() => this.close(toast), 5000);
  }

  close(toast) {
    toast.style.animation = 'slideOut 0.3s ease-out forwards';
    setTimeout(() => {
      if (toast.parentNode === this.container) {
        this.container.removeChild(toast);
      }
    }, 300);
  }

  success(message) {
    this.show(message, 'success');
  }

  error(message) {
    this.show(message, 'error');
  }

  info(message) {
    this.show(message, 'info');
  }
}