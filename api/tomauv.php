<?php

$userRegion = $_GET["region"];

$url = "https://indiceuv.cl/ws/wsIndiceUVREST.php?id_region=" . $userRegion;




// Iniciar la sesión cURL
$ch = curl_init();
$options = array(
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_USERAGENT => 'Mozilla/4.0 (compatible; MSIE 5.01; Windows NT 5.0)',
    CURLOPT_URL => $url
);
curl_setopt_array($ch, $options);
$output = curl_exec($ch);

if (!$output) {
    echo "Curl Error : " . curl_error($ch);
} else {
    // Simplemente imprimir la respuesta JSON sin procesar
    echo $output;
}

curl_close($ch);
?>
