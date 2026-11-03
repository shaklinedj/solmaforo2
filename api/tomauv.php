<?php
header('Content-Type: application/json; charset=utf-8');

$userRegion = isset($_GET["region"]) ? (int)$_GET["region"] : 7;

$regionesCoords = [
    1  => ['lat' => -18.4783, 'lon' => -70.3126], // Arica y Parinacota (Arica)
    2  => ['lat' => -20.2133, 'lon' => -70.1503], // Tarapacá (Iquique)
    3  => ['lat' => -23.6509, 'lon' => -70.3975], // Antofagasta
    4  => ['lat' => -27.3668, 'lon' => -70.3323], // Atacama (Copiapó)
    5  => ['lat' => -29.9027, 'lon' => -71.2519], // Coquimbo (La Serena)
    6  => ['lat' => -33.0472, 'lon' => -71.6127], // Valparaíso
    7  => ['lat' => -33.4489, 'lon' => -70.6693], // Región Metropolitana (Santiago)
    8  => ['lat' => -34.1708, 'lon' => -70.7444], // O'Higgins (Rancagua)
    9  => ['lat' => -35.4264, 'lon' => -71.6554], // Maule (Talca)
    10 => ['lat' => -36.6063, 'lon' => -72.1023], // Ñuble (Chillán)
    11 => ['lat' => -36.8201, 'lon' => -73.0444], // Biobío (Concepción)
    12 => ['lat' => -38.7359, 'lon' => -72.5904], // La Araucanía (Temuco)
    13 => ['lat' => -39.8142, 'lon' => -73.2459], // Los Ríos (Valdivia)
    14 => ['lat' => -41.4693, 'lon' => -72.9424], // Los Lagos (Puerto Montt)
    15 => ['lat' => -45.5752, 'lon' => -72.0662], // Aysén (Coyhaique)
    16 => ['lat' => -53.1638, 'lon' => -70.9171], // Magallanes (Punta Arenas)
];

// 1. Intentar con la API original de indiceuv.cl
$url = "https://indiceuv.cl/ws/wsIndiceUVREST.php?id_region=" . $userRegion;

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 3,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    CURLOPT_URL => $url
]);
$output = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$dataOriginal = json_decode($output, true);
if ($httpCode === 200 && !empty($dataOriginal) && isset($dataOriginal['data'][0]['max_diaria'])) {
    echo $output;
    exit;
}

// 2. Fallback automático a Open-Meteo
$coords = isset($regionesCoords[$userRegion]) ? $regionesCoords[$userRegion] : $regionesCoords[7];
$urlFallback = sprintf(
    "https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f&daily=uv_index_max&current=uv_index&timezone=America%%2FSantiago",
    $coords['lat'],
    $coords['lon']
);

$ch2 = curl_init();
curl_setopt_array($ch2, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 4,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_USERAGENT => 'SolmaforoApp/1.0',
    CURLOPT_URL => $urlFallback
]);
$fallbackResponse = curl_exec($ch2);
$httpCode2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
curl_close($ch2);

$dataFallback = json_decode($fallbackResponse, true);
if ($httpCode2 === 200 && isset($dataFallback['daily']['uv_index_max'][0])) {
    $maxDiaria = $dataFallback['daily']['uv_index_max'][0];
    echo json_encode([
        'source' => 'open-meteo-fallback',
        'data' => [
            [
                'max_diaria' => (string)$maxDiaria
            ]
        ]
    ]);
} else {
    http_response_code(503);
    echo json_encode([
        'error' => 'No fue posible obtener el índice UV en este momento.'
    ]);
}
?>