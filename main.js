// Dados Fictícios
const services = [
    { id: 1, name: "Alongamento", duration: "2h 30m", price: "R$ 140,00" },
    { id: 2, name: "Manutenção 30 dias", duration: "2h", price: "R$ 110,00" },
    { id: 3, name: "Manutenção 20 dias", duration: "2h", price: "R$ 90,00" },
    { id: 4, name: "Manutenção 15 dias", duration: "2h", price: "R$ 80,00" },
    { id: 5, name: "Esmaltação em gel", duration: "1h", price: "R$ 70,00" },
    { id: 6, name: "Esmaltação comum", duration: "30 min", price: "R$ 30,00" },
    { id: 7, name: "Recolocação de unha perdida", duration: "15 min", price: "R$ 10,00/cada" },
    { id: 8, name: "Encapsuladas", duration: "15 min", price: "R$ 10,00/cada" },
    { id: 9, name: "Nail Art", duration: "10 min", price: "R$ 10,00/cada" }
];

const availableTimes = ["09:00", "10:30", "13:00", "14:30", "16:00", "17:30"];

// State Management
let state = {
    step: 1,
    services: [],
    date: null,
    time: null,
    name: "",
    phone: ""
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    initServices();
    initCalendar();
    renderTimes([]); // Inicia com todos os horários habilitados (ou pode iniciar mostrando pedir data)
});

// Render Services
function initServices() {
    const container = document.getElementById('services-container');
    container.innerHTML = services.map(s => `
        <div class="service-card" onclick="selectService(${s.id})" id="service-${s.id}">
            <div class="service-info">
                <h4>${s.name}</h4>
                <p><i class="fa-regular fa-clock"></i> ${s.duration}</p>
            </div>
            <div class="service-price">${s.price}</div>
        </div>
    `).join('');
}

// Calendar State
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function toggleCalendar() {
    const popup = document.getElementById('calendar-popup');
    popup.classList.toggle('open');
}

function initCalendar() {
    renderCalendar();
}

function renderCalendar() {
    const monthYear = document.getElementById('cal-month-year');
    const daysGrid = document.getElementById('calendar-days-grid');

    // Clear grid
    daysGrid.innerHTML = '';

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    monthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Empty slots before first day
    for (let i = 0; i < firstDay; i++) {
        daysGrid.innerHTML += `<div class="cal-day empty"></div>`;
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(currentYear, currentMonth, i);
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

        // Disable past dates and Sundays
        let classList = "cal-day";
        if (date < today || date.getDay() === 0) {
            classList += " disabled";
            daysGrid.innerHTML += `<div class="${classList}">${i}</div>`;
        } else {
            if (state.date === dateStr) {
                classList += " selected";
            }
            daysGrid.innerHTML += `<div class="${classList}" onclick="selectDate('${dateStr}', ${i})">${i}</div>`;
        }
    }
}

function prevMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

// Render Times
async function fetchBusyTimes(dateStr) {
    const container = document.getElementById('times-container');
    container.innerHTML = '<p style="grid-column: span 3; text-align: center; color: var(--text-muted); font-size: 14px;">Buscando horários disponíveis...</p>';

    const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwRK3DvVo61JeRAlxTWX3eCrzeyDwoLsFhjpRdIq1mLgv_bn3BxSPZRPtObiqNg2PnX/exec";

    try {
        const response = await fetch(`${WEBHOOK_URL}?date=${dateStr}`);
        const data = await response.json();

        if (data.error) {
            console.error("Erro no calendário:", data.error);
            return [];
        }

        return data.busy || [];
    } catch (error) {
        console.error("Erro ao buscar horários:", error);
        // Em caso de falha de conexão, liberamos os horários
        return [];
    }
}

// Helpers de cálculo de tempo
function timeToMins(tStr) {
    const [h, m] = tStr.split(':').map(Number);
    return h * 60 + m;
}

function getDurationMins(durationStr) {
    if (!durationStr) return 60;
    let totalMins = 0;
    const hMatch = durationStr.match(/(\d+)\s*h/);
    const mMatch = durationStr.match(/(\d+)\s*min?/);
    if (hMatch) totalMins += parseInt(hMatch[1]) * 60;
    if (mMatch) totalMins += parseInt(mMatch[1]);
    return totalMins;
}

function renderTimes(busyTimes) {
    const container = document.getElementById('times-container');
    const serviceDuration = state.services.length > 0 ? state.services.reduce((total, s) => total + getDurationMins(s.duration), 0) : 30;

    container.innerHTML = availableTimes.map(t => {
        const slotStartMins = timeToMins(t);
        const slotEndMins = slotStartMins + serviceDuration;

        const isBusy = busyTimes.some(b => {
            // Se o Google ainda estiver mandando o formato antigo (apenas a string do início, ex: "10:00")
            if (typeof b === "string") {
                const bStart = timeToMins(b);
                const bEnd = bStart + 60; // Assumimos que o evento no Calendar dura cerca de 1 hr para bloquear corretamente
                return (slotStartMins < bEnd && slotEndMins > bStart);
            }

            // Código para a Versão 2 (já mandando start e end)
            const bStart = timeToMins(b.start);
            const bEnd = timeToMins(b.end);

            // Detecta sobreposição (Colisão ocorre se: Início do Slot < Fim do Evento E Fim do Slot > Início do Evento)
            return (slotStartMins < bEnd && slotEndMins > bStart);
        });

        const className = isBusy ? "time-slot disabled" : "time-slot";
        const onclick = isBusy ? "" : `onclick="selectTime('${t}')"`;
        return `<div class="${className}" ${onclick} id="time-${t.replace(':', '')}">${t}</div>`;
    }).join('');
}


// ACTIONS
function selectService(id) {
    const service = services.find(s => s.id === id);
    
    // Toggle service in array
    const index = state.services.findIndex(s => s.id === id);
    if (index > -1) {
        state.services.splice(index, 1);
        document.getElementById(`service-${id}`).classList.remove('selected');
    } else {
        state.services.push(service);
        document.getElementById(`service-${id}`).classList.add('selected');
    }

    // Enable/disable next button
    const btnNext = document.getElementById('btn-next-step1');
    if (btnNext) {
        btnNext.disabled = state.services.length === 0;
    }
}

function selectDate(dateStr, dayNumber) {
    state.date = dateStr;
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    document.querySelector('#calendar-btn-label span').textContent = `${dayNumber} de ${monthNames[currentMonth]} ${currentYear}`;

    toggleCalendar();
    renderCalendar();

    // Resetamos o tempo escolhido quando muda a data e travamos o botão
    state.time = null;
    checkStep2Validity();

    // Mostramos o loading e buscamos os ocupados
    fetchBusyTimes(dateStr).then(busyTimes => {
        renderTimes(busyTimes);
    });
}

function selectTime(timeStr) {
    state.time = timeStr;

    // Se o usuário clicar num horário pré-definido, limpa o campo personalizado
    const customTimeInput = document.getElementById('custom-time');
    if (customTimeInput) customTimeInput.value = '';

    document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
    document.getElementById(`time-${timeStr.replace(':', '')}`).classList.add('selected');
    checkStep2Validity();
}

function selectCustomTime(timeStr) {
    state.time = timeStr;

    // Se o usuário digitar, remove a seleção dos botões de horário
    document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));

    checkStep2Validity();
}

function checkStep2Validity() {
    const btnNext = document.getElementById('btn-next-step2');
    if (state.date && state.time) {
        btnNext.disabled = false;
    } else {
        btnNext.disabled = true;
    }
}

function goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));

    // Update summary before going to step 3
    if (step === 3) {
        const serviceNames = state.services.map(s => s.name).join(' + ');
        
        let totalPrice = 0;
        let hasVariablePrice = false;
        
        state.services.forEach(s => {
            const match = s.price.match(/[\d,]+/);
            if (match) {
                totalPrice += parseFloat(match[0].replace(',', '.'));
            }
            if (s.price.includes('/cada') || s.price.includes('a partir')) {
                hasVariablePrice = true;
            }
        });
        
        let priceDisplay = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
        if (hasVariablePrice) {
            priceDisplay += ' (valor base)';
        }

        document.querySelector('#summary-service span').textContent = `${serviceNames} (${priceDisplay})`;

        // Format date BR
        const [year, month, day] = state.date.split('-');
        document.querySelector('#summary-datetime span').textContent = `${day}/${month}/${year} às ${state.time}`;
    }

    // Show requested step
    document.getElementById(`step-${step}`).classList.add('active');
    state.step = step;
}

function validateForm() {
    state.name = document.getElementById('client-name').value;
    state.phone = document.getElementById('client-phone').value;

    const btnFinish = document.getElementById('btn-finish');
    if (state.name.trim().length > 2 && state.phone.trim().length >= 10) {
        btnFinish.disabled = false;
    } else {
        btnFinish.disabled = true;
    }
}

async function finishBooking() {
    const btnFinish = document.getElementById('btn-finish');
    const originalText = btnFinish.textContent;
    btnFinish.disabled = true;
    btnFinish.textContent = "Salvando na agenda...";

    // Número atualizado da Duda (DDI + DDD + Número)
    const phoneToMsg = "5519998523996";

    const [year, month, day] = state.date.split('-');
    const dateFormatted = `${day}/${month}`;

    const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwRK3DvVo61JeRAlxTWX3eCrzeyDwoLsFhjpRdIq1mLgv_bn3BxSPZRPtObiqNg2PnX/exec";

    try {
        const payload = {
            name: state.name,
            phone: state.phone,
            service: state.services.map(s => s.name).join(', '),
            date: state.date,
            time: state.time,
            duration: state.services.reduce((total, s) => total + getDurationMins(s.duration), 0)
        };

        // Envia os dados para o Google Apps Script (usando text/plain para evitar erro de CORS)
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            }
        });
    } catch (error) {
        console.error("Erro ao salvar no calendário:", error);
    } finally {
        // Restaura o botão
        btnFinish.textContent = originalText;
        btnFinish.disabled = false;

        // Abre o WhatsApp mesmo que dê erro no calendário, para não perder o agendamento
        const serviceNamesMsg = state.services.map(s => s.name).join(' e ');
        const message = `Olá Duda, tudo bem? Sou a ${state.name} e acabei de agendar um horário dia ${dateFormatted} às ${state.time} para os serviços de: ${serviceNamesMsg}.`;
        const whatsappUrl = `https://wa.me/${phoneToMsg}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }
}
