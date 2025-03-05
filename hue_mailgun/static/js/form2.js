
$(document).ready(function(){
    $('#submit').on('click',function(event){
         event.preventDefault();
         var email =  $('#email').val();
         if (!validateEmail(email)){
            $('#email').css('background','#faa');
            $('#email').val('Pls enter a valid email');
            return;
         } else {
            $('#email').css('background','#fff');
         }
         $.ajax({
            type: 'POST',
            url: "/waitlist/apply",
            headers: {
                "X-CSRFToken" : csrf,
                "Content-Type": "application/json"
            },
            data : JSON.stringify({ 
                email : email,
                howhear : $('#howhear').val(),
                clientId : clientId,
                }).replaceAll("',","',\n"),
            dataType : 'json',
            contentType : 'application/json',
            success: function (e) {
                alert('Thanks for joining our waitlist, '+$('#email').val()+'!');
                $('input').each(function(){$(this).val('');})
            },
            error: function (e) {
                alert('something went wrong. Please come back later!');
            },
        });
    });
});

const validateEmail = (email) => {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};
