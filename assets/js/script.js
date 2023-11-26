
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
    regionSeleccionada.innerText = `: ${userRegionName}`;

    if (!userRegion) {
        // Si no hay una región guardada, abrir el modal automáticamente
        regionModal.show();

        confirmRegionButton.addEventListener("click", function () {
            const selectedRegion = regionSelector.value;
            const selectedRegionName = regionSelector.options[regionSelector.selectedIndex].text;


            localStorage.setItem("userRegion", selectedRegion);
            localStorage.setItem("userRegionName", selectedRegionName);
            regionModal.hide();


            window.location.reload()
        });


    }
});





async function obtenerIndiceUV() {


    // Hacer la solicitud al archivo PHP con la región del usuario
    const url = `api/tomauv.php?region=${userRegion}`;
    


    try {
        //  const response = await fetch("tomauv4.php");
        const response = await fetch(url);
        //si sale unn aeror 
        if (response.status === 403) {
            document.body.style.background = 'linear-gradient(120deg, #ffe53bd8, #ff2525da)'; // Fondo por defecto
            document.getElementById('uv-index').textContent = '';
            document.getElementById('uv-message').textContent = "ups tenemos problemas intentaremos mas tarde ";


            const animacionErrorContainer = document.getElementById('lottieContainer');
            animacionErrorContainer.innerHTML = '';
            animation = lottie.loadAnimation({
                container: animacionErrorContainer,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: 'assets/error2.json'

            });
            return;
        } else if (response.status === 404) {
            // Tratamiento de error 404
            document.body.style.background = 'linear-gradient(120deg, #ffe53bd8, #ff2525da)';
            document.getElementById('uv-index').textContent = '';
            document.getElementById('uv-message').textContent = "No se encontró la información que buscas.";

            const animacionErrorContainer = document.getElementById('lottieContainer');
            animacionErrorContainer.innerHTML = '';
            animation = lottie.loadAnimation({
                container: animacionErrorContainer,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: 'assets/error2.json' 
            });
            return;
        }
      
        //desde aqui si todo va bien
        const data = await response.json();
        const uvIndex = Math.round(parseFloat(data.data[0].max_diaria));
        ultimallamada = new Date();

        // Definir colores según los rangos de índice UV
        const uvColors = {
            'Bajo': '#2EEA1D',
            'Moderado': 'yellow',
            'Alto': '#EF6C00',
            'Muy Alto': '#B71C1C',
            'Extremo': '#6A1B9A',
        };

       const mensajesChilenos = {
    'Bajo': ' El índice UV es bajo hoy. Puedes permanecer al aire libre sin riesgo, pero es importante que te protejas si tu piel es muy sensible. ☀️😎',
    'Moderado': 'Hoy el índice UV es moderado. Recuerda usar protector solar y mantenerte a la sombra entre las 11:00 y las 16:00 horas. Viste ropa de manga larga, pantalón largo, zapatos cerrados, sombrero o casco de ala ancha y gafas con filtro UV-A y UV-B. Utiliza un bloqueador solar de amplio espectro (UVA-A - UV-B FP 30) para proteger tu piel. ☀️🧴🕶️',
    'Alto': 'El índice UV es alto hoy. Protégete del sol y evita permanecer al aire libre entre las 11:00 y las 16:00 horas. Es imprescindible usar ropa de manga larga con tela de trama cerrada, pantalón largo, zapatos, casco o sombrero de ala ancha y pañuelo legionario. Además, utiliza gafas con filtro UV-A y UV-B, y bloqueador solar de amplio espectro (UVA-A - UV-B FP 30). ☀️🧴🕶️👒',
    'Muy Alto': 'Hoy la radiación UV es muy alta. No olvides usar protector solar y buscar sombra. Evita la exposición prolongada al sol, especialmente entre las 10:00 y las 16:00 horas. Viste ropa de manga larga, pantalones largos, un sombrero de ala ancha y gafas de sol con filtro UV-A y UV-B. Aplica generosamente bloqueador solar de amplio espectro (UVA-A - UV-B FP 30) en todas las áreas expuestas de tu piel y no olvides proteger tus labios con un bálsamo labial con protector solar. ☀️🧴🕶️👒👄',
    'Extremo': '\u26A0\uFE0F \u26A0\uFE0F  ¡Cuidado! El índice UV es extremo hoy. Evita la exposición al sol sin protección. Es peligroso estar al aire libre en este nivel de radiación ultravioleta. Permanece en interiores si es posible. Si debes salir, usa ropa de manga larga, pantalón largo, un sombrero de ala ancha y gafas de sol con filtro UV-A y UV-B. Aplica una cantidad abundante de bloqueador solar de amplio espectro (UVA-A - UV-B FP 50 o superior) en todas las áreas expuestas de tu piel y reaplica cada pocas horas. Busca sombra y evita la exposición directa al sol. Mantente hidratado bebiendo agua regularmente. ☀️🚫🕶️👒💧'
};

        // Determinar el color de fondo según el índice UV
        let backgroundColor = '#fff'; // Valor predeterminado
        let mensajeChileno = 'Normal';

        if (uvIndex >= 0 && uvIndex < 3) {
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

        // Actualiza el índice UV en el cuadro
        document.getElementById('uv-index').textContent = uvIndex.toFixed(2);

        document.getElementById('uv-message').textContent = mensajeChileno;

        const ultimallamadaElement = document.getElementById("ultimallamada");
        ultimallamadaElement.textContent = ultimallamada.toLocaleString();

        // Cambia la animación Lottie según el nivel de UV
        let lottieFileName;
        if (uvIndex >= 0 && uvIndex <= 11) {
            lottieFileName = `assets/uv${Math.floor(uvIndex)}.json`;
        } else {
            lottieFileName = 'assets/uv0.json'; // Nombre de archivo Lottie predeterminado
        }

        const animationContainer = document.getElementById('lottieContainer');
        animationContainer.innerHTML = ''; // Borra el contenedor anterior
       const animation = lottie.loadAnimation({
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


let lastApiCallTime = 0; // Variable para rastrear el tiempo de la última llamada a la API
const apiCallInterval = 60000; //
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

   
    const currentTime = `${hr}:${min}`;
    //   console.log(currentTime);
    const uvHours = ['08:00', '10:00', '12:00', '13:06', '16:00', '18:00'];
    if (uvHours.includes(currentTime) && (Date.now() - lastApiCallTime >= apiCallInterval)) {
        obtenerIndiceUV();
        lastApiCallTime = Date.now(); // Actualiza el tiempo de la última llamada


    }



   

}







// Llama a obtenerIndiceUV al inicio para obtener el primer resultado de la API
obtenerIndiceUV();

lastApiCallTime = Date.now();

// Llama a updateTime cada segundo para actualizar la hora
setInterval(updateTime, 1000);



/*
setInterval(function(){
    window.location.replace(url2);
    
} , 300000  );
 */



