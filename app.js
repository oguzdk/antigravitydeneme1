const body = document.body;
const themeToggle = document.getElementById('theme-toggle');
const dateDisplay = document.getElementById('date-display');
const modal = document.getElementById('habit-modal');
const form = document.getElementById('add-habit-form');
const colorOptions = document.querySelectorAll('.color-option');
const habitColorInput = document.getElementById('habit-color');
const habitsListContainer = document.getElementById('habits-list-container');

// Stats Elements
const statStreak = document.getElementById('stat-streak');
const statCompleted = document.getElementById('stat-completed');
const statTotal = document.getElementById('stat-total');
const progressBarFill = document.getElementById('daily-progress-bar');
const progressText = document.getElementById('daily-progress-text');

// State Management
let habits = JSON.parse(localStorage.getItem('habits') || '[]');
let theme = localStorage.getItem('theme') || 'dark'; // Default to dark for premium feel
let userXP = parseInt(localStorage.getItem('userXP') || '0');
let currentLoadedDate = '';

// Initial Setup
function init() {
    // Initialize Lucide Icons
    lucide.createIcons();
    
    // Set Theme
    setTheme(theme);
    
    // Set Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = new Date().toLocaleDateString('tr-TR', options);
    
    currentLoadedDate = getTodayStr();

    // Render & Gamification
    updateGamification();
    renderHabits();
    
    // Check Reports
    checkReports();
    
    // Midnight check for auto-refresh
    setInterval(() => {
        const d = getTodayStr();
        if (d !== currentLoadedDate) {
            currentLoadedDate = d;
            dateDisplay.textContent = new Date().toLocaleDateString('tr-TR', options);
            renderHabits();
            checkReports();
        }
    }, 60000); // Her dakika kontrol et
}

// ==========================================
// Theme Management
// ==========================================
themeToggle.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(theme);
    localStorage.setItem('theme', theme);
    if(window.triggerCloudSync) window.triggerCloudSync();
});

function setTheme(themeName) {
    if (themeName === 'dark') {
        body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i data-lucide="sun"></i>';
    } else {
        body.removeAttribute('data-theme');
        themeToggle.innerHTML = '<i data-lucide="moon"></i>';
    }
    lucide.createIcons();
}

// ==========================================
// Modal & Form Management
// ==========================================
function openModal() {
    modal.classList.add('active');
    document.getElementById('habit-name').focus();
}

function closeModal() {
    modal.classList.remove('active');
    form.reset();
    
    // Reset Color Picker
    colorOptions.forEach(opt => opt.classList.remove('active'));
    colorOptions[0].classList.add('active');
    habitColorInput.value = colorOptions[0].dataset.color;
}

function toggleTargetInput() {
    const type = document.getElementById('habit-type').value;
    document.getElementById('target-input-group').style.display = type === 'numeric' ? 'block' : 'none';
}
window.toggleTargetInput = toggleTargetInput;

colorOptions.forEach(option => {
    option.addEventListener('click', () => {
        colorOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        habitColorInput.value = option.dataset.color;
    });
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('habit-name').value.trim();
    const color = document.getElementById('habit-color').value;
    const timeOfDay = document.getElementById('habit-time').value;
    const type = document.getElementById('habit-type').value;
    const target = type === 'numeric' ? parseInt(document.getElementById('habit-target').value) : 1;
    
    if (name) {
        addHabit(name, color, timeOfDay, type, target);
        closeModal();
    }
});

// ==========================================
// Core Logical Functions
// ==========================================
function addHabit(name, color, timeOfDay = 'anytime', type = 'boolean', target = 1) {
    const newHabit = {
        id: Date.now().toString(),
        name: name,
        color: color,
        timeOfDay: timeOfDay,
        type: type,
        target: target,
        createdAt: new Date().toISOString(),
        history: {} // Store completion dates
    };
    
    habits.push(newHabit);
    saveAndRender();
}

function toggleHabit(id) {
    const today = getTodayStr();
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    
    if (habit.history[today]) {
        delete habit.history[today];
        addXP(-10);
    } else {
        habit.history[today] = true;
        addXP(10);
        // Fire Confetti if turning on!
        fireConfetti();
    }
    
    saveAndRender();
}

function updateNumeric(id, amount) {
    const today = getTodayStr();
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    
    let current = habit.history[today] || 0;
    if (current === true) current = habit.target || 1; // Fallback
    
    // XP addition handling: avoid rewarding infinitely beyond target (optional constraint but let's reward up to target)
    let amountToReward = amount;
    
    current += amount;
    if (current < 0) current = 0;
    
    if (current > 0) {
        habit.history[today] = current;
    } else {
        delete habit.history[today];
    }
    
    addXP(amountToReward * 2); // Give 2 XP per numeric step
    
    // Check if target newly reached to fire confetti
    if (current >= habit.target && (current - amount) < habit.target && amount > 0) {
        fireConfetti();
    }
    
    saveAndRender();
}

window.toggleHabit = toggleHabit;
window.updateNumeric = updateNumeric;

function addXP(amount) {
    userXP += amount;
    if (userXP < 0) userXP = 0;
    localStorage.setItem('userXP', userXP);
    updateGamification();
    if(window.triggerCloudSync) window.triggerCloudSync();
}

function deleteHabit(id) {
    if (confirm('Bu alışkanlığı silmek istediğine emin misin? Tüm geçmişin silinecek.')) {
        habits = habits.filter(h => h.id !== id);
        saveAndRender();
    }
}

function saveAndRender() {
    localStorage.setItem('habits', JSON.stringify(habits));
    renderHabits();
    if(window.triggerCloudSync) window.triggerCloudSync();
}

// ==========================================
// Firebase Sync Helpers
// ==========================================
window.triggerCloudSync = function() {
    if(window.syncToCloud) {
        window.syncToCloud({
            habits: habits,
            userXP: userXP,
            theme: theme,
            lastOpenedMonth: localStorage.getItem('lastOpenedMonth') || '',
            lastOpenedYear: localStorage.getItem('lastOpenedYear') || ''
        });
    }
};

window.reloadAppFromLocal = function() {
    habits = JSON.parse(localStorage.getItem('habits') || '[]');
    userXP = parseInt(localStorage.getItem('userXP') || '0');
    theme = localStorage.getItem('theme') || 'dark';
    
    setTheme(theme);
    updateGamification();
    renderHabits();
    if(window.lucide) window.lucide.createIcons();
};

// ==========================================
// Helpers & Calculations
// ==========================================
function getTodayStr() {
    const d = new Date();
    // Use local time, format YYYY-MM-DD padding with zero
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
}

function updateStats() {
    const today = getTodayStr();
    
    let completedTodayCount = 0;
    
    habits.forEach(h => {
        let currentVal = h.history[today];
        if (h.type === 'numeric') {
            if (currentVal >= h.target) completedTodayCount++;
        } else {
            if (currentVal) completedTodayCount++;
        }
    });

    const total = habits.length;
    
    // Calculate global streak calculation (simplistic version based on if ANY habit was done)
    let globalMaxStreak = 0;
    
    habits.forEach(habit => {
        let currentStreak = 0;
        let checkDate = new Date();
        
        while(true) {
            const checkStr = [checkDate.getFullYear(), (checkDate.getMonth()+1).toString().padStart(2,'0'), checkDate.getDate().toString().padStart(2,'0')].join('-');
            
            let isDone = false;
            let val = habit.history[checkStr];
            if (habit.type === 'numeric') {
                isDone = val >= habit.target;
            } else {
                isDone = !!val;
            }

            if(isDone) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                if(checkStr === today) {
                    checkDate.setDate(checkDate.getDate() - 1);
                    const yestStr = [checkDate.getFullYear(), (checkDate.getMonth()+1).toString().padStart(2,'0'), checkDate.getDate().toString().padStart(2,'0')].join('-');
                    
                    let yestDone = false;
                    let yestVal = habit.history[yestStr];
                    if (habit.type === 'numeric') yestDone = yestVal >= habit.target;
                    else yestDone = !!yestVal;

                    if(!yestDone) break;
                } else {
                    break;
                }
            }
        }
        if(currentStreak > globalMaxStreak) globalMaxStreak = currentStreak;
    });

    statStreak.textContent = `${globalMaxStreak} Gün`;
    statCompleted.textContent = completedTodayCount;
    statTotal.textContent = total;
    
    // Progress Bar
    const percentage = total === 0 ? 0 : Math.round((completedTodayCount / total) * 100);
    progressBarFill.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}%`;
}

// ==========================================
// Gamification Utilities
// ==========================================
function updateGamification() {
    const level = Math.floor(userXP / 100) + 1;
    const currentLevelXP = userXP % 100;
    
    document.getElementById('user-level-text').textContent = 'Seviye ' + level;
    document.getElementById('xp-text').textContent = currentLevelXP + ' / 100 XP';
    
    const percentage = Math.round((currentLevelXP / 100) * 100);
    document.getElementById('xp-progress-bar').style.width = percentage + '%';
}

// ==========================================
// Render Engine
// ==========================================
function renderHabits() {
    habitsListContainer.innerHTML = '';
    const today = getTodayStr();
    
    if (habits.length === 0) {
        habitsListContainer.innerHTML = `
            <div class="empty-state">
                <i data-lucide="coffee"></i>
                <p>Henüz bir alışkanlık eklemedin. <br> Yukarıdaki butonla ilk hedefini belirle!</p>
            </div>
        `;
        updateStats();
        lucide.createIcons();
        return;
    }

    const groups = {
        'morning': { title: 'Sabah Rutini', items: [] },
        'afternoon': { title: 'Öğle Rutini', items: [] },
        'evening': { title: 'Akşam Rutini', items: [] },
        'anytime': { title: 'Esnek Görevler', items: [] }
    };

    habits.forEach(habit => {
        const timeGrp = habit.timeOfDay || 'anytime';
        groups[timeGrp].items.push(habit);
    });

    Object.keys(groups).forEach(key => {
        const group = groups[key];
        if (group.items.length === 0) return;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'routine-header';
        headerDiv.innerHTML = `<i data-lucide="clock"></i> ${group.title}`;
        habitsListContainer.appendChild(headerDiv);

        group.items.forEach(habit => {
            let currentVal = habit.history[today] || 0;
            if (currentVal === true) currentVal = habit.target || 1;
            
            const isCompletedToday = habit.type === 'numeric' 
                ? (currentVal >= habit.target)
                : !!habit.history[today];
            
            const habitDiv = document.createElement('div');
            habitDiv.className = `habit-item ${isCompletedToday ? 'completed' : ''}`;
            
            let controlHTML = '';
            if (habit.type === 'numeric') {
                controlHTML = `
                    <div class="numeric-controls">
                        <button class="btn-numeric" onclick="updateNumeric('${habit.id}', -1)">-</button>
                        <span class="numeric-value">${currentVal} / ${habit.target}</span>
                        <button class="btn-numeric" onclick="updateNumeric('${habit.id}', 1)">+</button>
                    </div>
                `;
            } else {
                controlHTML = `
                    <label class="checkbox-wrapper">
                        <input type="checkbox" ${isCompletedToday ? 'checked' : ''} onchange="toggleHabit('${habit.id}')">
                        <span class="checkmark" style="border-color: ${isCompletedToday ? habit.color : 'var(--border-color)'}; background-color: ${isCompletedToday ? habit.color : 'transparent'}">
                            <i data-lucide="check"></i>
                        </span>
                    </label>
                `;
            }

            habitDiv.innerHTML = `
                <div class="habit-info-group">
                    ${controlHTML}
                    <div class="habit-name" style="cursor: pointer;" onclick="openDetailModal('${habit.id}')">${habit.name}</div>
                </div>
                
                <div class="habit-info-group" style="gap: 1rem;">
                    <div class="habit-meta" style="color: ${habit.color}">
                        <i data-lucide="circle" fill="${habit.color}" stroke="none"></i>
                    </div>
                    <button class="delete-btn" onclick="deleteHabit('${habit.id}')" title="Sil">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            `;
            habitsListContainer.appendChild(habitDiv);
        });
    });

    updateStats();
    lucide.createIcons();
}

function fireConfetti() {
    if(typeof confetti === 'function') {
        const count = 200;
        const defaults = {
          origin: { y: 0.7 },
          zIndex: 9999
        };

        function fire(particleRatio, opts) {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio)
          });
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
    }
}

// ==========================================
// Reports Engine
// ==========================================
function checkReports() {
    const today = new Date();
    const currentMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    const currentYear = today.getFullYear().toString();
    
    const lastOpenedMonth = localStorage.getItem('lastOpenedMonth') || currentMonth;
    const lastOpenedYear = localStorage.getItem('lastOpenedYear') || currentYear;
    
    let reportGenerated = false;

    // Yıllık Rapor Kontrolü (Yeni yıla girildiyse)
    if (lastOpenedYear !== currentYear) {
        generateReport(lastOpenedYear, lastOpenedYear + ' Yılının Özeti');
        localStorage.setItem('lastOpenedYear', currentYear);
        // Eğer yılı raporladıysak, aynı anda ayı da raporlamaya gerek yok (isteğe bağlı)
        localStorage.setItem('lastOpenedMonth', currentMonth); 
        reportGenerated = true;
        if(window.triggerCloudSync) window.triggerCloudSync();
    } 
    // Aylık Rapor Kontrolü (Yeni aya girildiyse ve henüz yıl raporlanmadıysa)
    else if (lastOpenedMonth !== currentMonth && !reportGenerated) {
        const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
        const [y, m] = lastOpenedMonth.split('-');
        const monthLabel = monthNames[parseInt(m) - 1] + ' ' + y;
        
        generateReport(lastOpenedMonth, monthLabel + ' Özeti');
        localStorage.setItem('lastOpenedMonth', currentMonth);
        if(window.triggerCloudSync) window.triggerCloudSync();
    }
    
    // Uygulama ilk açıldığında localStorage boşsa doldurmak için:
    if(!localStorage.getItem('lastOpenedMonth')) localStorage.setItem('lastOpenedMonth', currentMonth);
    if(!localStorage.getItem('lastOpenedYear')) localStorage.setItem('lastOpenedYear', currentYear);
}

function generateReport(periodPrefix, title) {
    let totalDone = 0;
    let mostSuccessfulHabit = { name: '-', count: 0 };
    
    habits.forEach(habit => {
        let habitCount = 0;
        // İlgili periyotta (örn "2026-04-" veya "2026-") tamamlananları say
        Object.keys(habit.history).forEach(dateStr => {
            if (dateStr.startsWith(periodPrefix)) {
                habitCount++;
                totalDone++;
            }
        });
        
        if (habitCount > mostSuccessfulHabit.count) {
            mostSuccessfulHabit = { name: habit.name, count: habitCount };
        }
    });

    // Modalı Doldur
    document.getElementById('report-title').textContent = title;
    const content = document.getElementById('report-content');
    
    content.innerHTML = `
        <div class="report-stat-item">
            <span>Tamamlanan Toplam Görev</span>
            <span>${totalDone}</span>
        </div>
        <div class="report-stat-item">
            <span>En Çaba Gösterilen Alışkanlık</span>
            <span>${mostSuccessfulHabit.name} (${mostSuccessfulHabit.count} kez)</span>
        </div>
        <p style="margin-top: 1.5rem; color: var(--text-muted); font-size: 0.95rem;">
            Geçtiğimiz dönemdeki çabaların için tebrikler! Daha fazlasını başarmak için bu motivasyonu koru.
        </p>
    `;
    
    document.getElementById('report-modal').classList.add('active');
    fireConfetti(); // Rapor çıkarken kutlama!
}

function closeReportModal() {
    document.getElementById('report-modal').classList.remove('active');
}

// ==========================================
// Habit Detail Modal & Heatmap
// ==========================================
function openDetailModal(habitId) {
    const habit = habits.find(h => h.id === habitId);
    if(!habit) return;

    document.getElementById('detail-title').textContent = habit.name + ' Detayı';
    
    // Yalnızca son 30 günü hesaplayıp heatmap'i dolduralım.
    const heatmapContainer = document.getElementById('heatmap-container');
    heatmapContainer.innerHTML = '';
    
    let checkDate = new Date();
    // Son 30 günü array'e topla (Eskiden yeniye doğru)
    const days = [];
    for(let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(checkDate.getDate() - i);
        days.push(d);
    }
    
    days.forEach(d => {
        const dateStr = [d.getFullYear(), (d.getMonth()+1).toString().padStart(2,'0'), d.getDate().toString().padStart(2,'0')].join('-');
        
        let isDone = false;
        let val = habit.history[dateStr];
        if (habit.type === 'numeric') {
            isDone = val >= habit.target;
        } else {
            isDone = !!val;
        }

        const dayDiv = document.createElement('div');
        dayDiv.className = `heatmap-day ${isDone ? 'done' : ''}`;
        
        const displayDate = d.toLocaleDateString('tr-TR', {month:'short', day:'numeric'});
        dayDiv.title = displayDate + (isDone ? ' - Başarılı' : ' - Yapılmadı');
        
        heatmapContainer.appendChild(dayDiv);
    });

    document.getElementById('habit-detail-modal').classList.add('active');
}

function closeDetailModal() {
    document.getElementById('habit-detail-modal').classList.remove('active');
}
window.openDetailModal = openDetailModal;

// ==========================================
// Settings & Data Management
// ==========================================
function openSettingsModal() {
    document.getElementById('settings-modal').classList.add('active');
}

function closeSettingsModal() {
    document.getElementById('settings-modal').classList.remove('active');
}

function exportData() {
    const data = {
        habits: habits,
        userXP: userXP,
        theme: theme,
        lastOpenedMonth: localStorage.getItem('lastOpenedMonth') || '',
        lastOpenedYear: localStorage.getItem('lastOpenedYear') || '',
        exportDate: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const dt = new Date();
    const filename = `HabitFlow_Yedek_${dt.getFullYear()}${dt.getMonth()+1}${dt.getDate()}.json`;
    
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if(importedData.habits) {
                habits = importedData.habits;
                userXP = importedData.userXP || parseInt(localStorage.getItem('userXP') || '0');
                theme = importedData.theme || 'dark';
                
                localStorage.setItem('habits', JSON.stringify(habits));
                localStorage.setItem('userXP', userXP.toString());
                localStorage.setItem('theme', theme);
                if(importedData.lastOpenedMonth) localStorage.setItem('lastOpenedMonth', importedData.lastOpenedMonth);
                if(importedData.lastOpenedYear) localStorage.setItem('lastOpenedYear', importedData.lastOpenedYear);
                
                alert('Veriler başarıyla yüklendi!');
                location.reload();
            } else {
                alert('Geçersiz dosya formatı.');
            }
        } catch (err) {
            alert('Dosya okunamadı: ' + err.message);
        }
    };
    reader.readAsText(file);
}

async function resetAllData() {
    if(confirm('TÜM verilerini silmek istediğine emin misin? Bu işlem geri alınamaz!')) {
        localStorage.clear();
        if(window.deleteCloudData) {
            await window.deleteCloudData();
        }
        location.reload();
    }
}

window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.exportData = exportData;
window.importData = importData;
window.resetAllData = resetAllData;

// Start
document.addEventListener('DOMContentLoaded', init);
