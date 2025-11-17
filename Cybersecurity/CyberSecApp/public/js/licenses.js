// licenses.js - License management functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeLicensePage();
});

function initializeLicensePage() {
    // Generate License
    const generateBtn = document.getElementById('generateLicenseBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateLicense);
    }

    // Refresh Licenses
    const refreshBtn = document.getElementById('refreshLicensesBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadLicenses();
            loadStatistics();
        });
    }

    // Load data on page load
    loadLicenses();
    loadStatistics();
}

async function generateLicense() {
    const btn = this;
    const keyLength = document.getElementById('keyLength').value;
    
    btn.disabled = true;
    btn.innerHTML = '⏳ Generowanie...';
    
    try {
        const response = await fetch('/admin/licenses/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Key-Length': keyLength
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('originalKey').textContent = result.licenseKey;
            document.getElementById('encryptedKey').textContent = result.encryptedKey;
            document.getElementById('shiftKey').textContent = result.shiftKey;
            document.getElementById('licenseResult').style.display = 'block';
            
            // Scroll to result
            document.getElementById('licenseResult').scrollIntoView({ behavior: 'smooth' });
            
            // Refresh licenses list
            loadLicenses();
            loadStatistics();
        } else {
            alert('Błąd: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Błąd podczas generowania klucza');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🗝️ Wygeneruj Klucz Licencyjny';
    }
}

// Load Licenses Table
async function loadLicenses() {
    try {
        const response = await fetch('/admin/licenses/list');
        const result = await response.json();
        
        if (result.success) {
            const tbody = document.getElementById('licensesTableBody');
            
            if (result.licenses.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">Brak wygenerowanych kluczy</td></tr>';
                return;
            }
            
            const licensesHtml = result.licenses.map(license => `
                <tr class="${license.is_used ? 'table-success' : ''}">
                    <td><code>${license.encrypted_key}</code></td>
                    <td><span class="badge badge-secondary">${license.shift_key}</span></td>
                    <td>
                        ${license.is_used ? 
                            '<span class="badge badge-success">Użyty</span>' : 
                            '<span class="badge badge-warning">Dostępny</span>'
                        }
                    </td>
                    <td>${license.used_by_username || '-'}</td>
                    <td>${new Date(license.created_at).toLocaleString('pl-PL')}</td>
                    <td>${license.used_at ? new Date(license.used_at).toLocaleString('pl-PL') : '-'}</td>
                </tr>
            `).join('');
            
            tbody.innerHTML = licensesHtml;
            
            // Update counters
            const total = result.licenses.length;
            const used = result.licenses.filter(l => l.is_used).length;
            const available = total - used;
            
            document.getElementById('totalLicenses').textContent = total;
            document.getElementById('usedLicenses').textContent = used;
            document.getElementById('availableLicenses').textContent = available;
        }
    } catch (error) {
        console.error('Error loading licenses:', error);
        document.getElementById('licensesTableBody').innerHTML = 
            '<tr><td colspan="6" class="text-center text-danger">Błąd podczas ładowania kluczy</td></tr>';
    }
}

// Load Statistics
async function loadStatistics() {
    try {
        const response = await fetch('/admin/licenses/stats');
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('totalUsers').textContent = result.totalUsers;
            document.getElementById('premiumUsers').textContent = result.premiumUsers;
            document.getElementById('trialUsers').textContent = result.trialUsers;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}