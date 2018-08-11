function preventDefault(e) {
    console.log('preventDefault');
    e.preventDefault();
}

$(document.body).on('show.bs.modal', '.modal', function() {
    document.body.addEventListener("touchmove", preventDefault, false);
});

$(document.body).on('hide.bs.modal', '.modal', function() {
    document.body.removeEventListener("touchmove", preventDefault, false);
});
