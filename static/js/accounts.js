// Code for handling accounts
// Keeping it simple with jQuery and raw requests as this page
// does not require a lot of logic

// Reset carousel whenever it opens/closes
$('#addAccountModal').on('show.bs.modal', _ => {
    $('#addAccountCarousel').carousel(0)
    $('#addAccountCarousel').carousel('pause')

    $('#addAccountSubmitButton').fadeTo(0, 0)
})

// When someone selects an account type to add
$('.account-type-selection>button').click(_ => {
    // Insert the correct form
    $('.add-account-form').html($('#addPoloniexAccountForm').html())


    $('#addAccountCarousel').carousel(1)
    $('#addAccountCarousel').carousel('pause')

    // Show the add account button
    $('#addAccountSubmitButton').fadeTo(0.5, 1)
})

$('.btn-loader').on('click', function() {
    var $this = $(this);
  $this.button('loading');
    setTimeout(function() {
       $this.button('reset');
   }, 8000);
});

$('#poloniexAddAccountForm').submit(e => {
    e.preventDefault();
    $('#poloniexAddAccountForm button').html('<i class="fa fa-circle-o-notch fa-spin"></i> Adding...')
})