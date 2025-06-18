const CONFIG = {
    // Google Apps Script Web App URL 
    apiEndpoint: 'https://script.google.com/macros/s/AKfycbz69YHcyxVZ6Nr9nNkGhGoksbiMliFseUx9ERIHRRG08hpNiXl9f3ZgGaGxtn89uuZt/exec',

    scannerConfig: {
        fps: 10,
        qrbox: {
            width: 250,
            height: 250
        },
        formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_128
        ],
        showTorchButtonIfSupported: true,
        //helllooo k xaaa 
        showZoomSliderIfSupported: true
    },

    // Maximum food count per day
    maxFoodPerDay: 3
};