import { useState } from 'react';

export default function ContactModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const { name, email, subject, message } = formData;

    // Simple validation (though 'required' on inputs handles most of this)
    if (!name || !email || !subject || !message) {
      alert('Please fill in all fields.');
      return;
    }

    const recipient = 'support@aptico.ai';
    const body = `From: ${name} (${email})\n\nMessage:\n${message}`;
    
    // Construct Gmail Compose URL
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open Gmail in a new tab
    window.open(gmailUrl, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl animate-fade-in-up">
        <div className="border-b border-[var(--border)] bg-[var(--panel-soft)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="app-kicker mb-1">Get in touch</p>
              <h2 className="text-xl font-black text-[var(--text)]">Contact Aptico</h2>
            </div>
            <button 
              onClick={onClose}
              className="app-icon-button hover:bg-red-500/10 hover:text-red-500"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="app-field-label">Your Name</label>
            <input 
              required
              className="app-input" 
              placeholder="e.g. Alex Rivera"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="app-field-label">Your Email</label>
            <input 
              required
              type="email"
              className="app-input" 
              placeholder="alex@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="app-field-label">Subject</label>
            <input 
              required
              className="app-input" 
              placeholder="How can we help?"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="app-field-label">Message</label>
            <textarea 
              required
              rows="4"
              className="app-input resize-none" 
              placeholder="Describe your request..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            />
          </div>

          <div className="pt-2">
            <button type="submit" className="app-button w-full justify-center py-4 shadow-lg shadow-[var(--accent-soft)]">
              <span className="material-symbols-outlined text-[18px]">send</span>
              Open Gmail Compose
            </button>
            <p className="mt-4 text-center text-[10px] text-[var(--muted)]">
              This will open a new Gmail tab with your message pre-filled.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
