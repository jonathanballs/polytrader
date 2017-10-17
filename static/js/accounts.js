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

$('.btn-loader').click( _ => {
    var $this = $(this);
  $this.button('loading');
    setTimeout(function() {
       $this.button('reset');
   }, 8000);
});

// Make sure that the add account button actually submits the form

var submitAddAccountForm = function() {
    $('button#addAccountSubmitButton').html('<i class="fa fa-circle-o-notch fa-spin"></i> Adding...')

    // Get form elements and submit it
    var accountType = $('#addAccountCarousel #accountType').val()

    if (accountType == 'poloniex') {
        var apiKey = $('#poloniexApiKey').val()
        var apiSecret = $('#poloniexApiSecret').val()

        $.post('/account/accounts/new', {accountType, apiKey, apiSecret}, _ => {

            // On success
            $('button#addAccountSubmitButton').html('<i class="fa fa-check"></i> Added')
            $('button#addAccountSubmitButton').addClass('btn-success')
            $('button#addAccountSubmitButton').removeClass('btn-primary')
            $('button#addAccountSubmitButton').prop("disabled", true)
        })

        console.log({apiKey, apiSecret})
    }

    // When it is successfully added
    setTimeout(_ => {
    }, 3000)
}

$('#addAccountSubmitButton').click(_ => {
    submitAddAccountForm();
})

$('#poloniexAddAccountForm').submit(e => {
    e.preventDefault();
    submitAddAccountForm();
})