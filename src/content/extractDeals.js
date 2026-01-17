// Extract deals from ActiveCampaign deals page

async function extractDeals() {
  console.log('Extracting deals...');
  const deals = [];

  try {
    await waitForElement('table tbody tr, [data-deal-id], .deal-card, .pipeline-card', 5000);
    
    // Strategy 1: Table layout
    const tableRows = document.querySelectorAll('table tbody tr');
    
    if (tableRows.length > 0) {
      tableRows.forEach((row, index) => {
        try {
          const cells = row.querySelectorAll('td');
          if (cells.length < 3) return;

          const title = cells[0]?.textContent?.trim() || '';
          const value = cells[1]?.textContent?.trim() || '';
          const stage = cells[2]?.textContent?.trim() || '';
          const contact = cells[3]?.textContent?.trim() || '';

          if (title) {
            deals.push({
              id: row.dataset.dealId || `deal_${index}_${Date.now()}`,
              title,
              value: value || 'N/A',
              pipeline: extractPipeline(row),
              stage: stage || 'Unknown',
              contact: contact || 'N/A',
              owner: extractOwner(row)
            });
          }
        } catch (err) {
          console.error('Error parsing deal row:', err);
        }
      });
    } else {
      // Strategy 2: Card layout (Kanban view)
      const dealCards = document.querySelectorAll('[data-deal-id], .deal-card, .pipeline-card, .kanban-card');
      
      dealCards.forEach((card, index) => {
        try {
          const title = card.querySelector('[data-field="title"], .deal-title, h3, h4')?.textContent?.trim() || '';
          const value = card.querySelector('[data-field="value"], .deal-value, .amount')?.textContent?.trim() || '';
          const stage = card.querySelector('[data-field="stage"], .deal-stage, .stage-name')?.textContent?.trim() || '';
          const contact = card.querySelector('[data-field="contact"], .contact-name')?.textContent?.trim() || '';

          if (title) {
            deals.push({
              id: card.dataset.dealId || `deal_${index}_${Date.now()}`,
              title,
              value: value || 'N/A',
              pipeline: extractPipeline(card),
              stage: stage || 'Unknown',
              contact: contact || 'N/A',
              owner: extractOwner(card)
            });
          }
        } catch (err) {
          console.error('Error parsing deal card:', err);
        }
      });
    }

  } catch (error) {
    console.error('Error extracting deals:', error);
  }

  console.log(`Extracted ${deals.length} deals`);
  return deals;
}

function extractPipeline(element) {
  const pipelineElement = element.querySelector('[data-pipeline], .pipeline, [data-field="pipeline"]');
  return pipelineElement?.textContent?.trim() || 'Sales';
}