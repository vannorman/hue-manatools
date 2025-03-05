
$(document).ready(function(){
    $('#submit').on('click',function(event){
         event.preventDefault();
         $.ajax({
            type: 'POST',
            url: "/internship/apply",
            headers: {
                "X-CSRFToken" : csrf,
                "Content-Type": "application/json"
            },
            data : JSON.stringify({ 
                which : $('#which').val(),
                name : $('#name').val(),
                email : $('#email').val(),
                link1 : $('#link1').val(),
                howhear : $('#howhear').val(),
                message : $('#message').val(),
                }).replaceAll("',","',\n"),
            dataType : 'json',
            contentType : 'application/json',
            success: function (e) {
                alert('Thanks for applying, '+$('#name').val()+'!');
                $('input').each(function(){$(this).val('');})
            },
            error: function (e) {
                alert('no');
            },
        });
    });
});
