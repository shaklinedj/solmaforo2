const url2 = 'http://localhost/accidentes/index.html';
// Obtener la región del usuario de localStorage
const userRegion = localStorage.getItem("userRegion");

let ultimallamada = new Date();

document.addEventListener("DOMContentLoaded", function () {

    function loadBootstrap() {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css';
        document.head.appendChild(link);
    }

    loadBootstrap();

    const regionModal = new bootstrap.Modal(document.getElementById("regionModal"));
    const regionSelector = document.getElementById("regionSelector");
    const confirmRegionButton = document.getElementById("confirmRegion");

    // Verificar si hay una región guardada en localStorage
    const userRegion = localStorage.getItem("userRegion");
    const userRegionName = localStorage.getItem("userRegionName");
    const regionSeleccionada = document.getElementById("userRegionName");
    regionSeleccionada.innerText = `: ${userRegionName || ''}`;

    if (!userRegion) {
        // Si no hay una región guardada, abrir el modal automáticamente
        regionModal.show();

        confirmRegionButton.addEventListener("click", function () {
            const selectedRegion = regionSelector.value;
            const selectedRegionName = regionSelector.options[regionSelector.selectedIndex].text;

            localStorage.setItem("userRegion", selectedRegion);
            localStorage.setItem("userRegionName", selectedRegionName);
            regionModal.hide();

            window.location.reload();
        });
    }
});

// Coordenadas de las 16 regiones de Chile
const regionesCoords = {
    1:  { lat: -18.4783, lon: -70.3126 }, // Arica y Parinacota (Arica)
    2:  { lat: -20.2133, lon: -70.1503 }, // Tarapacá (Iquique)
    3:  { lat: -23.6509, lon: -70.3975 }, // Antofagasta
    4:  { lat: -27.3668, lon: -70.3323 }, // Atacama (Copiapó)
    5:  { lat: -29.9027, lon: -71.2519 }, // Coquimbo (La Serena)
    6:  { lat: -33.0472, lon: -71.6127 }, // Valparaíso
    7:  { lat: -33.4489, lon: -70.6693 }, // Metropolitana (Santiago)
    8:  { lat: -34.1708, lon: -70.7444 }, // O'Higgins (Rancagua)
    9:  { lat: -35.4264, lon: -71.6554 }, // Maule (Talca)
    10: { lat: -36.6063, lon: -72.1023 }, // Ñuble (Chillán)
    11: { lat: -36.8201, lon: -73.0444 }, // Biobío (Concepción)
    12: { lat: -38.7359, lon: -72.5904 }, // La Araucanía (Temuco)
    13: { lat: -39.8142, lon: -73.2459 }, // Los Ríos (Valdivia)
    14: { lat: -41.4693, lon: -72.9424 }, // Los Lagos (Puerto Montt)
    15: { lat: -45.5752, lon: -72.0662 }, // Aysén (Coyhaique)
    16: { lat: -53.1638, lon: -70.9171 }  // Magallanes (Punta Arenas)
};

// 1. Consulta a Open-Meteo Weather API (índice en tiempo real + máxima del día)
async function obtenerUVOpenMeteo(regionId) {
    const coords = regionesCoords[regionId] || regionesCoords[7];
    const urlMeteo = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=uv_index&daily=uv_index_max&timezone=America%2FSantiago`;

    const response = await fetch(urlMeteo);
    if (!response.ok) {
        throw new Error(`Open-Meteo status: ${response.status}`);
    }
    const data = await response.json();
    const currentUV = (data.current && data.current.uv_index !== undefined) ? parseFloat(data.current.uv_index) : null;
    const maxUV = (data.daily && data.daily.uv_index_max && data.daily.uv_index_max[0] !== undefined) ? parseFloat(data.daily.uv_index_max[0]) : currentUV;

    return { current: currentUV, max: maxUV };
}

// 2. Consulta a indiceuv.cl mediante el proxy serverless de la app
async function obtenerUVIndiceUV(regionId) {
    let url = `api/tomauv?region=${regionId}`;
    let response = await fetch(url);

    if (response.status === 404) {
        response = await fetch(`api/tomauv.php?region=${regionId}`);
    }

    if (!response.ok) {
        throw new Error(`indiceuv.cl status: ${response.status}`);
    }
    const data = await response.json();
    if (!data || !data.data || !data.data[0] || data.data[0].max_diaria === undefined) {
        throw new Error("Formato inválido de indiceuv.cl");
    }
    const maxVal = parseFloat(data.data[0].max_diaria);

    // Si es de noche en Chile, el índice UV actual es 0
    const ahora = new Date();
    const hora = ahora.getHours() + ahora.getMinutes() / 60;
    const esNoche = hora >= 20.75 || hora < 6.5;

    return {
        current: esNoche ? 0 : maxVal,
        max: maxVal
    };
}

// 3. Consulta secundaria a Open-Meteo Air Quality (servidor de respaldo)
async function obtenerUVOpenMeteoSecundario(regionId) {
    const coords = regionesCoords[regionId] || regionesCoords[7];
    const urlMeteo = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lon}&current=uv_index&hourly=uv_index&timezone=America%2FSantiago`;

    const response = await fetch(urlMeteo);
    if (!response.ok) {
        throw new Error(`Open-Meteo Air Quality status: ${response.status}`);
    }
    const data = await response.json();
    const currentUV = (data.current && data.current.uv_index !== undefined) ? parseFloat(data.current.uv_index) : null;

    let maxUV = currentUV;
    if (data.hourly && Array.isArray(data.hourly.uv_index) && data.hourly.uv_index.length >= 24) {
        maxUV = Math.max(...data.hourly.uv_index.slice(0, 24));
    }

    return { current: currentUV, max: maxUV };
}

async function obtenerIndiceUV() {
    const regionActiva = localStorage.getItem("userRegion") || "7";
    let uvData = null;
    let fuenteUsada = "";

    // Intento 1: Open-Meteo Weather (Principal en tiempo real)
    try {
        uvData = await obtenerUVOpenMeteo(regionActiva);
        fuenteUsada = "Open-Meteo";
    } catch (meteoError) {
        console.warn("Open-Meteo Weather no respondió. Probando con indiceuv.cl...", meteoError);
    }

    // Intento 2 (Fallback): indiceuv.cl
    if (!uvData || uvData.current === null || isNaN(uvData.current)) {
        try {
            console.log("Probando con indiceuv.cl...");
            uvData = await obtenerUVIndiceUV(regionActiva);
            fuenteUsada = "indiceuv.cl";
        } catch (indiceError) {
            console.warn("indiceuv.cl no disponible o caído.", indiceError);
        }
    }

    // Intento 3 (Respaldo final): Servidor alternativo de radiación solar
    if (!uvData || uvData.current === null || isNaN(uvData.current)) {
        try {
            console.log("Probando con servidor secundario de Open-Meteo...");
            uvData = await obtenerUVOpenMeteoSecundario(regionActiva);
            fuenteUsada = "Open-Meteo (Backup)";
        } catch (secError) {
            console.error("Todas las APIs de índice UV fallaron:", secError);
        }
    }

    // Si ninguna fuente respondió, mostrar pantalla de error
    if (!uvData || uvData.current === null || isNaN(uvData.current)) {
        document.body.style.background = 'linear-gradient(120deg, #ffe53bd8, #ff2525da)';
        document.getElementById('uv-index').textContent = '';
        document.getElementById('uv-message').textContent = "Ups, tenemos problemas para obtener los datos solares. Intentaremos más tarde.";

        const animacionErrorContainer = document.getElementById('lottieContainer');
        animacionErrorContainer.innerHTML = '';
        lottie.loadAnimation({
            container: animacionErrorContainer,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: 'assets/error2.json'
        });
        return;
    }

    // Validación astronómica: En la noche (entre ~20:45 y 06:30) el índice UV es físicamente 0
    const ahora = new Date();
    const horaDecimal = ahora.getHours() + ahora.getMinutes() / 60;
    const esDeNoche = horaDecimal >= 20.75 || horaDecimal < 6.5;

    let uvIndexRaw = uvData.current;
    if (esDeNoche || uvIndexRaw < 0.1) {
        uvIndexRaw = 0;
    }

    const uvIndex = Math.round(uvIndexRaw);
    const maxDiaria = uvData.max !== null ? Math.round(uvData.max) : uvIndex;
    ultimallamada = new Date();

    console.log(`Índice UV actual: ${uvIndexRaw.toFixed(1)} (Max hoy: ${maxDiaria}) desde ${fuenteUsada}`);

    try {
        // Colores según los rangos estándar de índice UV (OMS)
        const uvColors = {
            'Noche': '#2EEA1D',    // Verde suave
            'Bajo': '#2EEA1D',     // Verde
            'Moderado': '#FFD600', // Amarillo
            'Alto': '#EF6C00',     // Naranja
            'Muy Alto': '#B71C1C', // Rojo
            'Extremo': '#6A1B9A',  // Morado
        };

        const mensajesChilenos = {
            'Noche': '🌙 Es de noche. En este momento la radiación ultravioleta es nula (0). No hay riesgo de exposición solar. ¡Que tengas un buen descanso! ✨',
            'Bajo': 'El índice UV es bajo hoy. Puedes permanecer al aire libre sin riesgo, pero es importante que te protejas si tu piel es muy sensible. ☀️😎',
            'Moderado': 'Hoy el índice UV es moderado. Recuerda usar protector solar y mantenerte a la sombra entre las 11:00 y las 16:00 horas. Viste ropa de manga larga, pantalón largo, zapatos cerrados, sombrero o casco de ala ancha y gafas con filtro UV-A y UV-B. Utiliza un bloqueador solar de amplio espectro (UVA-A - UV-B FP 30) para proteger tu piel. ☀️🧴🕶️',
            'Alto': 'El índice UV es alto hoy. Protégete del sol y evita permanecer al aire libre entre las 11:00 y las 16:00 horas. Es imprescindible usar ropa de manga larga con tela de trama cerrada, pantalón largo, zapatos, casco o sombrero de ala ancha y pañuelo legionario. Además, utiliza gafas con filtro UV-A y UV-B, y bloqueador solar de amplio espectro (UVA-A - UV-B FP 30). ☀️🧴🕶️👒',
            'Muy Alto': 'Hoy la radiación UV es muy alta. No olvides usar protector solar y buscar sombra. Evita la exposición prolongada al sol, especialmente entre las 10:00 y las 16:00 horas. Viste ropa de manga larga, pantalones largos, un sombrero de ala ancha y gafas de sol con filtro UV-A y UV-B. Aplica generosamente bloqueador solar de amplio espectro (UVA-A - UV-B FP 30) en todas las áreas expuestas de tu piel y no olvides proteger tus labios con un bálsamo labial con protector solar. ☀️🧴🕶️👒👄',
            'Extremo': '⚠️ ⚠️ ¡Cuidado! El índice UV es extremo hoy. Evita la exposición al sol sin protección. Es peligroso estar al aire libre en este nivel de radiación ultravioleta. Permanece en interiores si es posible. Si debes salir, usa ropa de manga larga, pantalón largo, un sombrero de ala ancha y gafas de sol con filtro UV-A y UV-B. Aplica una cantidad abundante de bloqueador solar de amplio espectro (UVA-A - UV-B FP 50 o superior) en todas las áreas expuestas de tu piel y reaplica cada pocas horas. Busca sombra y evita la exposición directa al sol. Mantente hidratado bebiendo agua regularmente. ☀️🚫🕶️👒💧'
        };

        // Determinar estado, color y mensaje
        let backgroundColor = '#fff';
        let mensajeChileno = 'Normal';

        if (esDeNoche && uvIndex === 0) {
            backgroundColor = uvColors['Noche'];
            mensajeChileno = mensajesChilenos['Noche'];
        } else if (uvIndex >= 0 && uvIndex < 3) {
            backgroundColor = uvColors['Bajo'];
            mensajeChileno = mensajesChilenos['Bajo'];
        } else if (uvIndex >= 3 && uvIndex < 6) {
            backgroundColor = uvColors['Moderado'];
            mensajeChileno = mensajesChilenos['Moderado'];
        } else if (uvIndex >= 6 && uvIndex < 8) {
            backgroundColor = uvColors['Alto'];
            mensajeChileno = mensajesChilenos['Alto'];
        } else if (uvIndex >= 8 && uvIndex < 11) {
            backgroundColor = uvColors['Muy Alto'];
            mensajeChileno = mensajesChilenos['Muy Alto'];
        } else if (uvIndex >= 11) {
            backgroundColor = uvColors['Extremo'];
            mensajeChileno = mensajesChilenos['Extremo'];
        }

        document.body.style.backgroundColor = backgroundColor;

        // Actualiza el índice UV en el cuadro (valor actual en tiempo real)
        document.getElementById('uv-index').textContent = uvIndex.toString();

        document.getElementById('uv-message').textContent = mensajeChileno;

        // Mostrar hora y máxima pronosticada en el footer
        const ultimallamadaElement = document.getElementById("ultimallamada");
        if (ultimallamadaElement) {
            const horaStr = ultimallamada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            ultimallamadaElement.textContent = `${horaStr} (Máx. hoy: ${maxDiaria})`;
        }

        // Animación Lottie según nivel UV actual
        let lottieFileName = (uvIndex >= 0 && uvIndex <= 11) ? `assets/uv${uvIndex}.json` : 'assets/uv0.json';

        const animationContainer = document.getElementById('lottieContainer');
        animationContainer.innerHTML = '';
        lottie.loadAnimation({
            container: animationContainer,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: lottieFileName
        });

    } catch (error) {
        console.error(error);
    }
}

let lastApiCallTime = 0;
// Intervalo de refresco: cada 15 minutos se actualiza automáticamente día y noche
const apiCallInterval = 15 * 60 * 1000;

async function updateTime() {
    const horas = document.getElementById('horas');
    const minutos = document.getElementById('minutos');
    const segundos = document.getElementById('segundos');

    let dateToday = new Date();
    let hr = dateToday.getHours();
    let min = dateToday.getMinutes();
    let s = dateToday.getSeconds();

    if (hr < 10) hr = '0' + hr;
    if (min < 10) min = '0' + min;
    if (s < 10) s = '0' + s;

    horas.textContent = hr;
    minutos.textContent = min;
    segundos.textContent = s;

    // Se actualiza periódicamente cada 15 minutos
    if (Date.now() - lastApiCallTime >= apiCallInterval) {
        obtenerIndiceUV();
        lastApiCallTime = Date.now();
    }
}

// Carga inicial al abrir la página
obtenerIndiceUV();
lastApiCallTime = Date.now();

// Actualiza el reloj cada segundo
setInterval(updateTime, 1000);
