// Utility: Escape HTML to prevent XSS
function escapeHTML(str) {
    return str.replace(/[&<>"']/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[match]));
}

// Utility: Show toast notification
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerHTML = message;
    toast.classList.add('toast--visible');
    setTimeout(() => toast.classList.remove('toast--visible'), duration);
}

// Item Categories (Grains & Legumes as bag items)
const bagItems = [
    'beans', 'oloyin beans', 'brown beans', 'red beans', 'white beans', 'butter beans', 'iron beans',
    'rice', 'local rice', 'ofada rice', 'abakaliki rice', 'foreign rice', 'indian rice', 'thai parboiled rice',
    'maize', 'yellow maize', 'white maize', 'guinea corn', 'sorghum', 'gero',
    'millet', 'pearl millet', 'soya beans', 'cowpea', 'bambara nut'
];

// Determine Unit Type
function getUnitType(itemName) {
    const normalized = itemName.toLowerCase().trim();
    return bagItems.some(bagItem => normalized.includes(bagItem)) ? 'bag' : 'other';
}

// Capitalize Unit
function capitalizeUnit(unit) {
    return unit ? unit.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : '';
}

// Update Item Row Structure
function updateItemRow(row, itemName, qty = '', price = '', unit = '') {
    const unitType = getUnitType(itemName);
    let rowHTML = `
        <input type="text" placeholder="Item Name (e.g. Beans)" class="item-name" value="${escapeHTML(itemName)}" list="itemSuggestions" required aria-describedby="itemNameError" />
    `;
    if (unitType === 'other') {
        rowHTML += `
            <input type="number" placeholder="Qty" class="item-qty" value="${qty}" min="1" required aria-describedby="itemQtyError" />
        `;
    }
    rowHTML += `
        <input type="number" placeholder="Price (₦)" class="item-price" value="${price}" min="0" required aria-describedby="itemPriceError" />
        <input type="text" placeholder="Unit (e.g. Derica, optional)" class="item-unit" value="${escapeHTML(unit)}" aria-describedby="itemUnitError" />
        <button class="remove-item" aria-label="Remove Item"><i class="fas fa-trash"></i></button>
        <small class="error" id="itemNameError">Please enter item name.</small>
        ${unitType === 'other' ? '<small class="error" id="itemQtyError">Quantity must be at least 1.</small>' : ''}
        <small class="error" id="itemPriceError">Price cannot be negative.</small>
        <small class="error" id="itemUnitError"></small>
    `;
    row.innerHTML = rowHTML;
    row.className = 'form__group item-row';

    const nameInput = row.querySelector('.item-name');
    const qtyInput = row.querySelector('.item-qty');
    const priceInput = row.querySelector('.item-price');
    const unitInput = row.querySelector('.item-unit');
    nameInput.addEventListener('input', () => {
        updateItemRow(row, nameInput.value, qtyInput ? qtyInput.value : '', priceInput.value, unitInput.value);
        validateItemRow.call(nameInput);
    });
    if (qtyInput) qtyInput.addEventListener('input', validateItemRow);
    priceInput.addEventListener('input', validateItemRow);
    unitInput.addEventListener('input', validateItemRow);
    row.querySelector('.remove-item').addEventListener('click', () => {
        row.remove();
        updateLivePreview();
    });
}

// DOM References
const itemRows = document.getElementById('itemRows');
const receiptOutput = document.getElementById('receiptOutput');
const receiptActions = document.getElementById('receiptActions');
const dailyStats = document.getElementById('dailyStats');
const pastReceipts = document.getElementById('pastReceipts');
const onboardingModal = document.getElementById('onboardingModal');
const shareModal = document.getElementById('shareModal');
const primaryColorInput = document.getElementById('primaryColor');

// Local Storage with Error Handling
let salesToday = [];
let pastReceiptsData = [];
let itemsList = [];
try {
    salesToday = JSON.parse(localStorage.getItem('salesToday')) || [];
    pastReceiptsData = JSON.parse(localStorage.getItem('pastReceipts')) || [];
    itemsList = JSON.parse(localStorage.getItem('itemsList')) || [];
} catch (e) {
    console.error('Error parsing localStorage:', e);
    localStorage.setItem('salesToday', JSON.stringify([]));
    localStorage.setItem('pastReceipts', JSON.stringify([]));
    localStorage.setItem('itemsList', JSON.stringify([]));
}
const today = new Date().toISOString().split('T')[0];
if (salesToday.length > 0 && salesToday[0].time.split('T')[0] !== today) {
    salesToday = [];
    localStorage.setItem('salesToday', JSON.stringify(salesToday));
}

// Update item suggestions
function updateItemSuggestions() {
    const datalist = document.getElementById('itemSuggestions');
    if (!datalist) return;
    datalist.innerHTML = itemsList.map(item => `<option value="${escapeHTML(item)}">`).join('');
}

// Add Item Row
function addItemRow(name = '', qty = '', price = '', unit = '') {
    const row = document.createElement('div');
    updateItemRow(row, name, qty, price, unit);
    itemRows.appendChild(row);
    row.animate([
        { transform: 'translateX(-10px)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }
    ], { duration: 300, easing: 'ease-out' });
    updateItemSuggestions();
}
addItemRow();

// Validate Item Row
function validateItemRow() {
    const row = this.closest('.item-row');
    if (!row) return false;
    const name = row.querySelector('.item-name').value.trim();
    const qty = row.querySelector('.item-qty') ? parseInt(row.querySelector('.item-qty').value) : 1;
    const price = parseInt(row.querySelector('.item-price').value);
    const nameError = row.querySelector('#itemNameError');
    const qtyError = row.querySelector('#itemQtyError');
    const priceError = row.querySelector('#itemPriceError');
    const unitError = row.querySelector('#itemUnitError');

    let isValid = true;
    if (!name) {
        nameError.classList.add('error--visible');
        row.classList.add('item-row--invalid');
        isValid = false;
    } else {
        nameError.classList.remove('error--visible');
        row.classList.remove('item-row--invalid');
        if (!itemsList.some(existing => existing.toLowerCase() === name.toLowerCase())) {
            itemsList.push(name);
            localStorage.setItem('itemsList', JSON.stringify(itemsList));
            updateItemSuggestions();
        }
    }
    if (row.querySelector('.item-qty') && (isNaN(qty) || qty < 1)) {
        qtyError.classList.add('error--visible');
        row.classList.add('item-row--invalid');
        isValid = false;
    } else if (qtyError) {
        qtyError.classList.remove('error--visible');
        row.classList.remove('item-row--invalid');
    }
    if (isNaN(price) || price < 0) {
        priceError.classList.add('error--visible');
        row.classList.add('item-row--invalid');
        isValid = false;
    } else {
        priceError.classList.remove('error--visible');
        row.classList.remove('item-row--invalid');
    }
    unitError.classList.remove('error--visible');
    updateLivePreview();
    return isValid;
}

// Daily Stats
function updateDailyStats() {
    if (!dailyStats) return;
    const total = salesToday.reduce((acc, r) => acc + (r.amount || 0), 0);
    dailyStats.textContent = `📊 You've made ₦${total.toLocaleString()} in ${salesToday.length} receipts today.`;
}
updateDailyStats();

// Past Receipts
function updatePastReceipts() {
    if (!pastReceipts) return;
    pastReceipts.innerHTML = '';
    const fragment = document.createDocumentFragment();
    pastReceiptsData.forEach((receipt, index) => {
        const item = document.createElement('div');
        item.className = 'receipt-list__item';
        item.innerHTML = `
            <div class="receipt-list__details">
                <p><strong>Customer:</strong> ${escapeHTML(receipt.customer || 'N/A')}</p>
                <p><strong>Total:</strong> ₦${(receipt.total || 0).toLocaleString()}</p>
                <p><strong>Date:</strong> ${new Date(receipt.time).toLocaleString()}</p>
            </div>
            <button class="delete-receipt" aria-label="Delete Receipt"><i class="fas fa-trash"></i></button>
        `;
        item.querySelector('.delete-receipt').addEventListener('click', (e) => {
            e.stopPropagation();
            pastReceiptsData.splice(index, 1);
            localStorage.setItem('pastReceipts', JSON.stringify(pastReceiptsData));
            updatePastReceipts();
            showToast('Receipt deleted!');
        });
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-receipt')) {
                receiptOutput.innerHTML = receipt.html || '';
                receiptActions.style.display = 'flex';
                showToast('Loaded past receipt!');
            }
        });
        fragment.appendChild(item);
    });
    pastReceipts.appendChild(fragment);
}
updatePastReceipts();

// Generate Receipt Content
function generateReceiptContent(logoSrc = '') {
    const bizName = escapeHTML(document.getElementById('businessName').value.trim());
    const customerName = escapeHTML(document.getElementById('customerName').value.trim());
    const style = document.getElementById('styleSelector').value;
    const addWatermark = document.getElementById('addWatermark').checked;
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const discountType = document.getElementById('discountType').value;
    const primaryColor = primaryColorInput.value;

    let total = 0;
    let receiptHTML = `<div class="receipt receipt--${style}" style="--primary-color: ${primaryColor}">`;
    const logoTag = logoSrc ? `<img src="${logoSrc}" alt="Logo" class="receipt__logo" style="width: 50px; height: 50px; object-fit: contain; margin-right: 10px;" />` : '';

    receiptHTML += `
        <div class="receipt__header" style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
            ${logoTag}
            <h2 style="margin: 0; text-align: center; flex-grow: 1;">${bizName || 'Your Business'}</h2>
        </div>
        <p>Customer Name: ${customerName || 'N/A'}</p>
    `;

    const items = [];
    let isValid = true;
    document.querySelectorAll('#itemRows .item-row').forEach(row => {
        const item = escapeHTML(row.querySelector('.item-name').value.trim());
        const unitType = getUnitType(item);
        const qty = unitType === 'other' ? parseInt(row.querySelector('.item-qty').value) || 1 : 1;
        const price = parseInt(row.querySelector('.item-price').value) || 0;
        const unit = escapeHTML(row.querySelector('.item-unit').value.trim());
        if (!validateItemRow.call(row.querySelector('.item-name'))) {
            isValid = false;
            return;
        }
        const sum = qty * price;
        total += sum;
        items.push({ item, qty, price, unit, sum });
        receiptHTML += `
            <div class="receipt__item">
                <p>Item Bought: ${item}: ${capitalizeUnit(unit)}</p>
                ${unitType === 'other' && qty > 1 ? `<p>Amount of Item Bought: ${qty}</p>` : ''}
                <p>Price of Item Bought: ₦${price.toLocaleString()}</p>
                <p>Quantity Unit: ${capitalizeUnit(unit)}</p>
            </div>
        `;
    });

    let discountAmount = 0;
    if (discount > 0) {
        if (discountType === 'percentage') {
            discountAmount = (total * discount) / 100;
        } else {
            discountAmount = discount;
        }
        if (discountAmount > total) {
            showToast('Discount cannot exceed total!');
            return null;
        }
        total -= discountAmount;
    }

    receiptHTML += `<p>Date: ${new Date().toLocaleString()}</p>`;
    if (discountAmount > 0) {
        receiptHTML += `<p>Discount: ${discountType === 'percentage' ? `${discount}%` : `₦${discount.toLocaleString()}`} (-₦${discountAmount.toLocaleString()})</p>`;
    }
    receiptHTML += `<p>Total Price of Goods Purchased: ₦${total.toLocaleString()}</p>`;

    if (addWatermark) {
        receiptHTML += `<div class="watermark">₦ PAID</div>`;
    }

    receiptHTML += `<p style="text-align: center; font-size: 12px; margin-top: 20px;">Built in 🇳🇬 for small hustlers</p>`;
    receiptHTML += `</div>`;
    return { html: receiptHTML, total, items, customer: customerName, time: new Date().toISOString(), isValid };
}

// Live Preview (Debounced)
let previewTimeout;
function updateLivePreview() {
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(() => {
        const result = generateReceiptContent();
        if (result && result.isValid && receiptOutput) {
            receiptOutput.innerHTML = result.html;
        }
    }, 500);
}

// Save Receipt Handler
function saveReceiptHandler() {
    const receiptHTML = receiptOutput.innerHTML;
    const fullHTML = `
        <html>
        <head>
            <title>Receipt</title>
            <style>
                body { font-family: 'Roboto Mono', monospace; padding: 20px; color: #1e293b; }
                .receipt { position: relative; max-width: 600px; margin: auto; border: 1px dashed #475569; padding: 20px; }
                .receipt__header { display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
                .receipt__logo { width: 50px; height: 50px; object-fit: contain; margin-right: 10px; }
                .receipt__header h2 { margin: 0; text-align: center; flex-grow: 1; }
                .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 40px; font-weight: 700; color: ${primaryColorInput.value}; opacity: 0.5; pointer-events: none; }
                p { margin-bottom: 0.5rem; line-height: 1.4; }
                .receipt__item { margin-top: 1rem; padding-top: 0.5rem; border-top: 1px dashed #475569; }
                .receipt__footer { text-align: center; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="receipt">
                ${receiptHTML}
            </div>
        </body>
        </html>
    `;
    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Receipt saved to phone!');
}

// Event Listeners
document.getElementById('generateReceipt').addEventListener('click', () => {
    const bizName = document.getElementById('businessName').value.trim();
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const discountError = document.getElementById('discountError');
    const bizNameError = document.getElementById('businessNameError');

    if (!bizName) {
        bizNameError.textContent = 'Please enter your business name.';
        bizNameError.classList.add('error--visible');
        showToast('Please enter your business name.');
        return;
    }
    bizNameError.classList.remove('error--visible');

    if (discount < 0) {
        discountError.textContent = 'Discount cannot be negative.';
        discountError.classList.add('error--visible');
        showToast('Discount cannot be negative.');
        return;
    }
    discountError.classList.remove('error--visible');

    const logoInput = document.getElementById('businessLogo');
    const reader = new FileReader();
    reader.onload = function (e) {
        const result = generateReceiptContent(e.target.result);
        if (!result || !result.isValid) {
            showToast('Please fill all required item fields.');
            return;
        }
        receiptOutput.innerHTML = result.html;
        receiptActions.style.display = 'flex';
        salesToday.push({ amount: result.total, time: result.time });
        pastReceiptsData.unshift(result);
        localStorage.setItem('salesToday', JSON.stringify(salesToday));
        localStorage.setItem('pastReceipts', JSON.stringify(pastReceiptsData.slice(0, 50)));
        updateDailyStats();
        updatePastReceipts();
        showToast('Receipt generated! <a href="https://chat.whatsapp.com/example" target="_blank">Join our WhatsApp group for free updates</a>', 5000);

        if (localStorage.getItem('hideShareModal') !== 'true' && shareModal) {
            shareModal.style.display = 'flex';
        }
    };
    if (logoInput.files[0]) {
        reader.readAsDataURL(logoInput.files[0]);
    } else {
        reader.onload({ target: { result: '' } });
    }
});

document.getElementById('addItem').addEventListener('click', () => addItemRow());

document.getElementById('printReceipt').addEventListener('click', () => {
    const printWin = window.open('', '', 'height=600,width=800');
    printWin.document.write(`
        <html>
        <head>
            <title>Receipt</title>
            <style>
                body { font-family: 'Roboto Mono', monospace; padding: 20px; color: #333; }
                .receipt { position: relative; max-width: 600px; margin: auto; border: 1px dashed #475569; padding: 20px; }
                .receipt__header { display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
                .receipt__logo { width: 50px; height: 50px; object-fit: contain; margin-right: 10px; }
                .receipt__header h2 { margin: 0; text-align: center; flex-grow: 1; }
                .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 40px; font-weight: bold; color: ${primaryColorInput.value}; opacity: 0.5; pointer-events: none; }
                p { margin-bottom: 0.5rem; line-height: 1.4; }
                .receipt__item { margin-top: 1rem; padding-top: 0.5rem; border-top: 1px dashed #666; }
                .footer { text-align: center; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="receipt">
                ${receiptOutput.innerHTML}
            </div>
        </body>
        </html>
    `);
    printWin.document.close();
    printWin.focus();
    printWin.print();
});

document.getElementById('copyText').addEventListener('click', () => {
    const temp = document.createElement('textarea');
    temp.value = receiptOutput.textContent;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
    showToast('Receipt copied to clipboard!');
});

document.getElementById('sendWhatsApp').addEventListener('click', () => {
    const text = encodeURIComponent(receiptOutput.textContent);
    const url = `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
});

document.getElementById('saveReceipt')?.addEventListener('click', saveReceiptHandler);

document.getElementById('speakItem').addEventListener('click', () => {
    if (!('webkitSpeechRecognition' in window)) {
        showToast('Speech recognition is only supported in Chrome or Edge browsers.');
        return;
    }
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-NG';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const speakBtn = document.getElementById('speakItem');
    speakBtn.classList.add('recording');
    showToast('Say item like: "Oloyin Beans 2 derica 500" or "Titus Sardines 1000"');
    recognition.start();

    recognition.onresult = (event) => {
        speakBtn.classList.remove('recording');
        const transcript = event.results[0][0].transcript.trim().toLowerCase();
        const parts = transcript.split(/\s+/);
        let name = '', qty = '', price = 0, unit = '';
        if (parts.length >= 2) {
            const priceIndex = parts.length - 1;
            price = parseInt(parts[priceIndex]) || 0;
            const unitIndex = parts.length - 2;
            if (parts.length >= 3 && isNaN(parseInt(parts[unitIndex]))) {
                unit = parts[unitIndex];
                name = parts.slice(0, unitIndex - (parts[0].match(/^\d+$/) ? 1 : 0)).join(' ');
            } else {
                name = parts.slice(0, priceIndex - (parts[0].match(/^\d+$/) ? 1 : 0)).join(' ');
            }
            const unitType = getUnitType(name);
            if (unitType === 'other') {
                qty = parseInt(parts[0]) || parseInt(parts[1]) || 1;
            } else {
                qty = 1;
            }
        }
        if (name && price >= 0) {
            addItemRow(name, qty, price, unit);
            showToast('Item added from voice!');
        } else {
            showToast('Please say: "Item [Unit] Price" or "Quantity [Unit] Item Price" (e.g., "Oloyin Beans 500" or "Egg 2 units 50")');
        }
    };

    recognition.onerror = (e) => {
        speakBtn.classList.remove('recording');
        showToast(`Voice input error: ${e.error}`);
    };
});

// Share Modal
document.getElementById('shareButton')?.addEventListener('click', () => {
    const dontShowAgain = document.getElementById('dontShowAgain').checked;
    if (dontShowAgain) {
        localStorage.setItem('hideShareModal', 'true');
    }
    if (navigator.share) {
        navigator.share({
            title: 'Naija Receipt Generator',
            text: 'Start generating awesome receipt for free with naija receipt generator!!',
            url: 'https://www.naijareceipt.netlify.app'
        }).then(() => {
            showToast('Shared successfully!');
        }).catch((error) => {
            if (error.name !== 'AbortError') {
                console.error('Error sharing:', error);
                showToast('Failed to share. Using WhatsApp instead.');
                fallbackShare();
            }
        });
    } else {
        showToast('Web Share not supported. Using WhatsApp.');
        fallbackShare();
    }
    shareModal.style.display = 'none';
});

function fallbackShare() {
    const shareText = encodeURIComponent('Start generating awesome receipt for free with naija receipt generator!! https://www.naijareceipt.netlify.app');
    const whatsappUrl = `https://wa.me/?text=${shareText}`;
    window.open(whatsappUrl, '_blank');
}

shareModal?.addEventListener('click', (e) => {
    if (e.target === shareModal) {
        const dontShowAgain = document.getElementById('dontShowAgain').checked;
        if (dontShowAgain) {
            localStorage.setItem('hideShareModal', 'true');
        }
        shareModal.style.display = 'none';
    }
});

// Dark Mode Toggle
document.getElementById('darkModeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    document.getElementById('darkModeToggle').innerHTML = document.body.classList.contains('dark-mode') ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});

// High Contrast Toggle
document.getElementById('highContrastToggle').addEventListener('click', () => {
    document.body.classList.toggle('high-contrast');
    localStorage.setItem('highContrast', document.body.classList.contains('high-contrast'));
});

// Onboarding Modal
if (!localStorage.getItem('onboardingShown')) {
    onboardingModal.style.display = 'flex';
    localStorage.setItem('onboardingShown', 'true');
}
document.getElementById('closeOnboarding').addEventListener('click', () => {
    onboardingModal.style.display = 'none';
});

// Initialize
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    document.getElementById('darkModeToggle').innerHTML = '<i class="fas fa-sun"></i>';
}
if (localStorage.getItem('highContrast') === 'true') {
    document.body.classList.add('high-contrast');
}
document.getElementById('businessName').addEventListener('input', () => {
    document.getElementById('businessNameError').classList.remove('error--visible');
    updateLivePreview();
});
document.getElementById('customerName').addEventListener('input', updateLivePreview);
document.getElementById('styleSelector').addEventListener('change', updateLivePreview);
document.getElementById('addWatermark').addEventListener('change', updateLivePreview);
document.getElementById('discount').addEventListener('input', () => {
    document.getElementById('discountError').classList.remove('error--visible');
    updateLivePreview();
});
document.getElementById('discountType').addEventListener('change', updateLivePreview);
primaryColorInput.addEventListener('change', () => {
    localStorage.setItem('primaryColor', primaryColorInput.value);
    updateLivePreview();
});
if (localStorage.getItem('primaryColor')) {
    primaryColorInput.value = localStorage.getItem('primaryColor');
}
updateLivePreview();