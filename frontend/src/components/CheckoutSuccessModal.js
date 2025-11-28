"use client";

import styles from "./CheckoutSuccessModal.module.css";

export default function CheckoutSuccessModal({ 
  isOpen, 
  onClose, 
  subtotal, 
  viewType = "kiosk" // "kiosk", "cashier", or "manager"
}) {
  if (!isOpen) return null;

  const isKiosk = viewType === "kiosk";
  const title = isKiosk ? "Thank you for your order!" : "Order placed successfully";

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.modalContent} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.successIcon}>✓</div>
          <div className={styles.subtotalSection}>
            <span className={styles.subtotalLabel}>Subtotal:</span>
            <span className={styles.subtotalAmount}>
              ${typeof subtotal === 'number' ? subtotal.toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button 
            onClick={onClose} 
            className={styles.closeButton}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}