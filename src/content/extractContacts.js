// Extract contacts from ActiveCampaign contacts page

async function extractContacts() {
  console.log('Extracting contacts...');
  const contacts = [];

  try {
    // Wait for table to load
    await waitForElement('table tbody tr, [data-contact-id], .contact-row', 5000);
    
    // Strategy 1: Try table rows
    const tableRows = document.querySelectorAll('table tbody tr');
    
    if (tableRows.length > 0) {
      tableRows.forEach((row, index) => {
        try {
          const cells = row.querySelectorAll('td');
          if (cells.length < 3) return;

          const nameCell = cells[0] || cells[1];
          const emailCell = cells[1] || cells[2];
          const phoneCell = cells[2] || cells[3];

          const name = nameCell?.textContent?.trim() || '';
          const email = emailCell?.textContent?.trim() || '';
          const phone = phoneCell?.textContent?.trim() || '';

          if (name && email) {
            contacts.push({
              id: row.dataset.contactId || `contact_${index}_${Date.now()}`,
              name,
              email,
              phone,
              tags: extractTags(row),
              owner: extractOwner(row)
            });
          }
        } catch (err) {
          console.error('Error parsing contact row:', err);
        }
      });
    } else {
      // Strategy 2: Try card-based layout
      const contactCards = document.querySelectorAll('[data-contact-id], .contact-card, .contact-item');
      
      contactCards.forEach((card, index) => {
        try {
          const name = card.querySelector('[data-field="name"], .contact-name, h3, h4')?.textContent?.trim() || '';
          const email = card.querySelector('[data-field="email"], .contact-email, [href^="mailto:"]')?.textContent?.trim() || '';
          const phone = card.querySelector('[data-field="phone"], .contact-phone, [href^="tel:"]')?.textContent?.trim() || '';

          if (name || email) {
            contacts.push({
              id: card.dataset.contactId || `contact_${index}_${Date.now()}`,
              name: name || 'Unknown',
              email: email || 'N/A',
              phone: phone || 'N/A',
              tags: extractTags(card),
              owner: extractOwner(card)
            });
          }
        } catch (err) {
          console.error('Error parsing contact card:', err);
        }
      });
    }

  } catch (error) {
    console.error('Error extracting contacts:', error);
  }

  console.log(`Extracted ${contacts.length} contacts`);
  return contacts;
}

function extractTags(element) {
  const tags = [];
  const tagElements = element.querySelectorAll('[data-tag], .tag, .badge, .label');
  
  tagElements.forEach(tag => {
    const text = tag.textContent?.trim();
    if (text && text.length < 50) {
      tags.push(text);
    }
  });
  
  return tags;
}

function extractOwner(element) {
  const ownerElement = element.querySelector('[data-owner], .owner, .assignee, [data-field="owner"]');
  return ownerElement?.textContent?.trim() || 'Unassigned';
}