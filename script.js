// Loader
window.addEventListener("load", () => {
  const loader = document.getElementById("loader");
  setTimeout(() => loader.classList.add("fade-out"), 2000);
});

let currentFolder = null, products = [], total = 0;

function toNumber(val){ return isNaN(val) || val=="" ? 0 : Number(val); }
function formatCurrency(num){ return Number(num).toLocaleString('en-IN'); }

window.onload = function(){
  const savedFolders = JSON.parse(localStorage.getItem("folders")) || [];
  savedFolders.forEach(folder => displayFolder(folder.name));
  
  // Load main QR code on app start
  loadMainQRCode();
};

// Main QR Code Functions (Global for the app)
function chooseQR() {
  document.getElementById('qrPicker').click();
}

function saveMainQR(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file (JPEG, PNG, etc.)');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const qrImageData = e.target.result;
    
    // Save QR code to localStorage as global QR code
    localStorage.setItem("mainQRCode", qrImageData);
    
    // Display the QR code
    displayMainQRCode(qrImageData);
    
    alert('✅ Payment QR Code saved successfully! This QR code will be used for all payments.');
  };
  reader.readAsDataURL(file);
}

function displayMainQRCode(qrImageData) {
  const qrImage = document.getElementById('mainQrImage');
  const noQRMessage = document.getElementById('noMainQRMessage');
  const shareQRBtn = document.getElementById('shareMainQRBtn');
  const removeQRBtn = document.getElementById('removeMainQRBtn');
  
  if (qrImageData) {
    qrImage.src = qrImageData;
    qrImage.style.display = 'block';
    qrImage.classList.add('qr-preview');
    noQRMessage.style.display = 'none';
    shareQRBtn.style.display = 'inline-block';
    removeQRBtn.style.display = 'inline-block';
  } else {
    qrImage.style.display = 'none';
    noQRMessage.style.display = 'block';
    shareQRBtn.style.display = 'none';
    removeQRBtn.style.display = 'none';
  }
}

function loadMainQRCode() {
  const mainQRCode = localStorage.getItem("mainQRCode");
  displayMainQRCode(mainQRCode);
}

function removeMainQR() {
  if (confirm('Are you sure you want to remove the payment QR code?')) {
    localStorage.removeItem("mainQRCode");
    displayMainQRCode(null);
    alert('QR code removed successfully.');
  }
}

function shareMainQR() {
  const mainQRCode = localStorage.getItem("mainQRCode");
  
  if (!mainQRCode) {
    alert('No QR code available to share.');
    return;
  }

  // Create a temporary link to download the QR code
  const link = document.createElement('a');
  link.href = mainQRCode;
  link.download = `Payment_QR_Code.png`;
  link.click();
  
  alert('QR code download started. You can share this image with customers.');
}

function sendPaymentLink() {
  const phone = document.getElementById("customerPhone").value;
  if (!phone) {
    alert("Please enter customer phone number first.");
    return;
  }

  const mainQRCode = localStorage.getItem("mainQRCode");
  
  if (!mainQRCode) {
    alert("Please add a payment QR code first from the main page.");
    return;
  }

  const remaining = total - getTotalGivenMoney();
  let message = `Payment Request\n`;
  message += `Amount: ₹${formatCurrency(remaining)}\n`;
  message += `Please use our payment QR code (available on main page) to pay online.\n`;
  message += `Thank you!`;
  
  window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
}

function createNewFolder(){
  const folderName = prompt("Enter Folder Name:");
  if(!folderName) return;
  let savedFolders = JSON.parse(localStorage.getItem("folders")) || [];
  if(savedFolders.some(f => f.name === folderName)) return alert("Folder already exists!");
  savedFolders.push({ 
    name: folderName, 
    products: [], 
    total: 0, 
    phone: "", 
    givenMoney: [],
    dailyLogs: []
  });
  localStorage.setItem("folders", JSON.stringify(savedFolders));
  displayFolder(folderName);
}

function displayFolder(name){
  const folderDiv = document.createElement("div");
  folderDiv.className = "folder";
  folderDiv.innerText = name;
  folderDiv.onclick = () => openFolderPage(name);
  document.getElementById("folders").appendChild(folderDiv);
}

function openFolderPage(name){
  currentFolder = name;
  document.getElementById("folderPage").style.display="none";
  document.getElementById("billingPage").style.display="block";
  document.getElementById("folderName").textContent = "📂 " + name;

  const today = new Date().toLocaleDateString('en-IN');
  document.getElementById("dateTime").textContent = "📅 " + today;

  let savedFolders = JSON.parse(localStorage.getItem("folders")) || [];
  const folder = savedFolders.find(f => f.name === name);
  products = folder?.products || [];

  if (!folder.dailyLogs) folder.dailyLogs = [];
  if (!folder.givenMoney) folder.givenMoney = [];
  
  if (!folder.dailyLogs.includes(today)) {
    folder.dailyLogs.push(today);
    localStorage.setItem("folders", JSON.stringify(savedFolders));
  }

  const container = document.getElementById("productsContainer");
  container.innerHTML = "";

  const dateHeader = document.createElement("h3");
  dateHeader.textContent = "🗓 Entries for " + today;
  container.appendChild(dateHeader);

  if(products.length === 0) addProductLine();
  else products.forEach(p => addProductLine(p.name, p.price));

  document.getElementById("customerPhone").value = folder?.phone || "";
  updateTotal();
  updateBalance();
  displayMoneyHistory();
  updatePaymentSummary();
}

function addProductLine(name = "", price = ""){
  const container = document.getElementById("productsContainer");
  const row = document.createElement("div");
  row.className = "product-row";

  const nameInput = document.createElement("input");
  nameInput.type = "text"; nameInput.placeholder = "Enter product name"; nameInput.value = name;
  nameInput.addEventListener("input", () => saveFolderSilently());

  const priceInput = document.createElement("input");
  priceInput.type = "number"; priceInput.placeholder = "Price ₹"; priceInput.value = price;
  priceInput.addEventListener("input", () => updateTotal(true));

  row.appendChild(nameInput);
  row.appendChild(priceInput);
  container.appendChild(row);
  updateTotal(true);
}

function updateTotal(autoSave=false){
  const prices = document.querySelectorAll('#productsContainer input[type="number"]');
  total = 0; prices.forEach(p => total += toNumber(p.value));
  document.getElementById("total").textContent = "Total: ₹" + formatCurrency(total);
  if(autoSave) saveFolderSilently();
  updatePaymentSummary();
}

function updateBalance(autoSave=false){
  const givenInput = document.getElementById("givenMoney");
  const given = toNumber(givenInput.value);
  
  if (given > 0) {
    showMoneySubtractionFeedback(given);
    saveGivenMoney(given);
  }
  
  const remElem = document.getElementById("remaining");
  const remaining = total - getTotalGivenMoney();

  if(remaining > 0){
    remElem.textContent = "Remaining: ₹" + formatCurrency(remaining);
    remElem.className = "red";
  }else{
    remElem.textContent = "✅ Fully Paid!";
    remElem.className = "green";
  }

  remElem.classList.add("flash");
  setTimeout(()=>remElem.classList.remove("flash"), 250);
  givenInput.value = "";
  saveFolderSilently();
  displayMoneyHistory();
  updatePaymentSummary();
}

function showMoneySubtractionFeedback(amount) {
  const feedback = document.createElement('div');
  feedback.className = 'money-subtraction-feedback';
  feedback.textContent = `- ₹${formatCurrency(amount)}`;
  document.body.appendChild(feedback);
  
  setTimeout(() => {
    document.body.removeChild(feedback);
  }, 1500);
}

function updatePaymentSummary() {
  const totalGiven = getTotalGivenMoney();
  const remaining = total - totalGiven;
  
  document.getElementById('totalAmountDisplay').textContent = `₹${formatCurrency(total)}`;
  document.getElementById('totalPaidDisplay').textContent = `₹${formatCurrency(totalGiven)}`;
  document.getElementById('remainingBalanceDisplay').textContent = `₹${formatCurrency(remaining)}`;
  
  const remainingElem = document.getElementById('remainingBalanceDisplay');
  if (remaining > 0) {
    remainingElem.style.color = '#ff6b6b';
  } else {
    remainingElem.style.color = '#00ff7f';
  }
}

function saveGivenMoney(amount) {
  const today = new Date().toLocaleDateString('en-IN');
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  let savedFolders = JSON.parse(localStorage.getItem("folders")) || [];
  const folderIndex = savedFolders.findIndex(f => f.name === currentFolder);
  
  if (folderIndex > -1) {
    if (!savedFolders[folderIndex].givenMoney) {
      savedFolders[folderIndex].givenMoney = [];
    }
    
    savedFolders[folderIndex].givenMoney.push({
      date: today,
      time: now,
      amount: amount,
      timestamp: new Date().toISOString()
    });
    
    localStorage.setItem("folders", JSON.stringify(savedFolders));
  }
}

function getTotalGivenMoney() {
  let savedFolders = JSON.parse(localStorage.getItem("folders")) || [];
  const folder = savedFolders.find(f => f.name === currentFolder);
  if (!folder || !folder.givenMoney) return 0;
  
  return folder.givenMoney.reduce((sum, entry) => sum + entry.amount, 0);
}

function displayMoneyHistory() {
  const historyContainer = document.getElementById("moneyHistory");
  let savedFolders = JSON.parse(localStorage.getItem("folders")) || [];
  const folder = savedFolders.find(f => f.name === currentFolder);
  
  if (!folder || !folder.givenMoney || folder.givenMoney.length === 0) {
    historyContainer.innerHTML = "<p>No money given yet</p>";
    return;
  }
  
  const sortedHistory = [...folder.givenMoney].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
  
  historyContainer.innerHTML = sortedHistory.map(entry => `
    <div class="money-entry">
      <span class="money-date">${entry.date} ${entry.time}</span>
      <span class="money-amount">₹${formatCurrency(entry.amount)}</span>
    </div>
  `).join('');
}

function saveFolderSilently(){
  const rows = document.querySelectorAll('.product-row');
  products = Array.from(rows)
    .filter(r => r.querySelector('input[type="text"]'))
    .map(r=>({
      name: r.querySelector('input[type="text"]').value,
      price: toNumber(r.querySelector('input[type="number"]').value)
    }));
  const phone = document.getElementById("customerPhone").value;
  let savedFolders = JSON.parse(localStorage.getItem("folders")) || [];
  const index = savedFolders.findIndex(f=>f.name===currentFolder);
  if(index>-1){ 
    savedFolders[index]={...savedFolders[index],products,total,phone}; 
  }
  localStorage.setItem("folders", JSON.stringify(savedFolders));
}

document.addEventListener("input", e => {
  if(e.target.id === "customerPhone") saveFolderSilently();
});

document.addEventListener('DOMContentLoaded', function() {
  const givenMoneyInput = document.getElementById('givenMoney');
  givenMoneyInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      updateBalance(true);
    }
  });
});

function saveFolder(){ 
  saveFolderSilently(); 
  alert("✅ Folder saved successfully!"); 
}

function deleteFolder(){
  if(confirm("Are you sure you want to delete this folder?")){
    let savedFolders = JSON.parse(localStorage.getItem("folders")) || [];
    savedFolders = savedFolders.filter(f=>f.name!==currentFolder);
    localStorage.setItem("folders", JSON.stringify(savedFolders));
    alert("🗑 Folder deleted successfully!");
    showFolderPage();
  }
}

function showFolderPage(){ 
  document.getElementById("billingPage").style.display="none"; 
  document.getElementById("folderPage").style.display="block"; 
}

function makeCall(){ 
  const phone=document.getElementById("customerPhone").value; 
  if(!phone)return alert("Please enter a phone number."); 
  window.location.href=`tel:${phone}`; 
}

function sendSMS(){
  const phone=document.getElementById("customerPhone").value;
  if(!phone)return alert("Please enter a phone number first.");
  const remaining = total - getTotalGivenMoney();
  let message = remaining > 0 
    ? `You have to pay ₹${formatCurrency(remaining)} — Kudachi mestri 8050671347`
    : `✅ Fully Paid! — Kudachi mestri 8050671347`;
  window.location.href=`sms:${phone}?body=${encodeURIComponent(message)}`;
}

function openVideo(){ 
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("tutorialVideo");
  modal.style.display = "flex"; 
  video.play();
}
function closeVideo(){ 
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("tutorialVideo");
  modal.style.display = "none"; 
  video.pause();
  video.currentTime = 0;
}