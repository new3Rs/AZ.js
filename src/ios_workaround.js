/* "passive" が使えるかどうかを検出 */
let passiveSupported = false;
try {
    document.addEventListener('test', null, Object.defineProperty(
        {},
        'passive',
        {
            get: function() {
                passiveSupported = true;
            }
        }
    ));
} catch(err) {}

function preventDefault(e) {
    e.preventDefault();
}

$(document.body).on('show.bs.modal', '.modal', function() {
    document.body.addEventListener(
        'touchmove',
        preventDefault,
        passiveSupported ? { passive: false } : false
    );
});

$(document.body).on('hide.bs.modal', '.modal', function() {
    document.body.removeEventListener(
        'touchmove',
        preventDefault,
        passiveSupported ? { passive: false } : false
    );
});
