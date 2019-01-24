$('.box-container').click(function() {
  $(this).addClass('active');
  $('.plane').remove();
  $('.form').delay( 1000 ).fadeIn( 700 );
  $('.form input').delay( 1000 ).fadeIn( 700 );
  $('.button').delay( 1000 ).fadeIn( 700 );
});