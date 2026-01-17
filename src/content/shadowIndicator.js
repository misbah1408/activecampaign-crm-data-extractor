// Shadow DOM indicator for extraction status

class ExtractionIndicator {
  constructor() {
    this.container = null;
    this.shadow = null;
  }

  show(message, type = 'info') {
    this.remove(); // Remove existing if any

    this.container = document.createElement('div');
    this.container.id = 'ac-extractor-indicator';
    
    // Create shadow DOM for CSS isolation
    this.shadow = this.container.attachShadow({ mode: 'open' });
    
    const style = document.createElement('style');
    style.textContent = `
      .indicator {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        animation: slideIn 0.3s ease-out;
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .indicator.info {
        border-left: 4px solid #3b82f6;
      }
      
      .indicator.success {
        border-left: 4px solid #10b981;
      }
      
      .indicator.error {
        border-left: 4px solid #ef4444;
      }
      
      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #e5e7eb;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .icon {
        width: 16px;
        height: 16px;
      }
      
      .message {
        color: #1f2937;
        font-weight: 500;
      }
    `;
    
    const indicator = document.createElement('div');
    indicator.className = `indicator ${type}`;
    
    if (type === 'info') {
      indicator.innerHTML = `
        <div class="spinner"></div>
        <div class="message">${message}</div>
      `;
    } else if (type === 'success') {
      indicator.innerHTML = `
        <div class="icon" style="color: #10b981;">✓</div>
        <div class="message">${message}</div>
      `;
    } else if (type === 'error') {
      indicator.innerHTML = `
        <div class="icon" style="color: #ef4444;">✗</div>
        <div class="message">${message}</div>
      `;
    }
    
    this.shadow.appendChild(style);
    this.shadow.appendChild(indicator);
    document.body.appendChild(this.container);
  }

  remove() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.shadow = null;
  }

  showSuccess(message, duration = 3000) {
    this.show(message, 'success');
    setTimeout(() => this.remove(), duration);
  }

  showError(message, duration = 5000) {
    this.show(message, 'error');
    setTimeout(() => this.remove(), duration);
  }
}

const indicator = new ExtractionIndicator();