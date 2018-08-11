function preventDefault(e) {
    e.preventDefault();
}

$(document.body).on('show.bs.modal', '.modal', function() {
    document.body.addEventListener("touchmove", preventDefault, { passive: false });
});

$(document.body).on('hide.bs.modal', '.modal', function() {
    document.body.removeEventListener("touchmove", preventDefault, { passive: false });
});
