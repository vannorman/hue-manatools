function uploadFile(file, overwrite) {
    let formData = new FormData();
    formData.append("file", file);
    formData.append("overwrite", overwrite);

    $.ajax({
        url: "/upload-list",
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function (response) {
            $("#message").text(response.message);
            loadLists();
            console.log("filename:"+file.name);
            let timeout = 200;
            if (window.location.href.includes('localhost')) timeout= 1500; // due to charlie's local refresh dev environment that auto reloads server on file changes like detecting the uploaded file. Server does not auto refresh so doesn't need much time to refresh
            setTimeout(function(){
                // because we empty list after loading new from server.
                $('#list-dropdown option').filter(function(){return $(this).val()==file.name}).prop('selected',true);
                },timeout);
        },
        error: function () {
            alert("Error uploading file.");
        }
    });
}

$(document).ready(function () {
    $('#csv-file').on('click',function(){
            $('#csv-file').val('')

    })
    $('#csv-file').on('change',function(){
        let file = document.getElementById("csv-file").files[0];
        let formData = new FormData();
        formData.append("file", file);
        let numLinesInUploadFile = -1;
        let reader = new FileReader();
        reader.onload = function (e) {
            let text = e.target.result;
            let emails = [];
            let duplicates = [];
            let lines =  text.split(/\r\n|\n/);
            numLinesInUploadFile = lines.length;
            lines.forEach(line => {
                let email = line.split(',')[1];
                if (emails.includes(email)){
                    duplicates.push(email);
                } else{
                    emails.push(email);    

                }
            });
            if (duplicates.length > 0){
                if (confirm('There were '+duplicates.length+" duplicate entries in "+file.name+", including "+JSON.stringify(duplicates).substr(0,100)+". Remove them?")){

                    // Modify file: remove lines containing a specific value
                    cleanedLines = []
                    duplicateLines = [];
                    lines.forEach(line=>{
                        if (!cleanedLines.includes(line)){
                            cleanedLines.push(line);
                        } 
                    });


                    file = new File([cleanedLines.join("\n")], file.name, { type: file.type });
                    
                    alert("Removed "+duplicates.length+" duplicates from "+file.name+", now has "+cleanedLines.length+" unique lines.");
                    numLinesInUploadFile = cleanedLines.length;
                } else {
                    alert("No duplicates removed. File still has "+lines.length+", "+duplicates.length+" of which are duplicates.");
                }
            }
        };
        reader.readAsText(file);// Modify file: remove lines containing a specific value

        $.ajax({
            url: "/try-upload-list",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                if (response.exists) {
                    
                    if (confirm("File named "+file.name+" with "+response.lines+" lines already exists. Do you want to overwrite it with new file with "+numLinesInUploadFile+" lines?")) {
                        uploadFile(file, true);
                        alert('Your file '+file.name+' with '+numLinesInUploadFile+" was uploaded, replacing the previous one which had "+response.lines+" lines.");
                    } else {
                        alert('Did not replace existing file with '+response.lines+' with your file with '+numLinesInUploadFile+" lines.");

                    }
                } else {
                    uploadFile(file, false);
                    alert('Uploaded your file with '+numLinesInUploadFile+" lines.");
                }
            },
            error: function () {
                alert("Error checking file existence.");
            }
        });    
    });
    $("#preview-csv").click(function () {
        let file = document.getElementById("csv-file").files[0];
        let reader = new FileReader();
        reader.onload = function (e) {
            let content = e.target.result;
            let lines = content.split("\n");
            let preview = "<ul>";
            for (let i = 0; i < Math.min(5, lines.length); i++) {
                preview += "<li>" + lines[i] + "</li>";
            }
            preview += "</ul>";
            $("#csv-preview").html(preview);
        };
        reader.readAsText(file);
    });

    $("#run-test").click(function () {
        let data = ValidateFormData();
          $.ajax({
            url: "/run-test", // Update to your Flask API URL
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function (response) {
                if (response.success){
                    console.log("Send success w data:"+JSON.stringify(response));
                    let subject = response.result.data.subject;
                    let count = response.result.count;
                    let from = response.result.data.from;
                    let recipients = response.result.data.recipients.substr(0,100);
                    $('#test-results').text("Success! '"+from+"' Sent ' "+subject+"' to  "+response.result.count+" recipients including "+recipients);
                } else {
                alert(response.message);
                
                }
            },
            error: function (response) {
                console.log(JSON.parse(JSON.stringify(response)).message);
                console.log(response);
                console.log("er:"+JSON.stringify(response));
            }

        });
    });
    
    $("#start-campaign").click(function () {
        RunCampaign();
        
    });
    
    $("#view-analytics").click(function () {
        let campaignId = $("#campaign-list").val();
        $.get("/analytics?campaign=" + campaignId, function (data) {
            $("#analytics-results").html(data);
        });
    });


    // Function to load campaigns into the dropdown
    function loadCampaigns() {
        $.ajax({
            url: "/get-campaigns", // Update to your Flask API URL
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({
                limit: 50,  // Adjust the limit as needed
                skip: 0
            }),
            success: function (response) {
                let dropdown = $("#campaign-dropdown");
                dropdown.empty(); // Clear existing options
                dropdown.append('<option value="">Select a campaign</option>'); // Default option

                if (response.success) {
                    response.campaigns.forEach(function (campaign) {
                        dropdown.append(`<option value="${campaign.name}">${campaign.name}</option>`);
                    });
                } else {
                    dropdown.append('<option value="">Error loading campaigns</option>');
                }
            },
            error: function () {
                $("#campaign-dropdown").html('<option value="">Failed to load campaigns</option>');
            }
        });
    }

    // get availabled send-from addresses
    function loadFroms() {
        $.ajax({
            url: "/get-from-addresses", // Update to your Flask API URL
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({
                limit: 50,  // Adjust the limit as needed
                skip: 0
            }),
            success: function (response) {
                let dropdown = $("#from-dropdown");
                dropdown.empty(); // Clear existing options
                dropdown.append('<option value="">Select a from</option>'); // Default option

                if (response.success) {
                    response.data.forEach(function (from) {
                        dropdown.append(`<option value="${from}">${from}</option>`);
                    });
                } else {
                    dropdown.append('<option value="">Error loading froms</option>');
                }
            },
            error: function () {
                $("#from-dropdown").html('<option value="">Failed to load froms</option>');
            }
        });
    }

 

    // Function to load lists into the dropdown
    window.loadLists = function() {
        window.listData = {};  // store all lists so when we select one we can refer to its data
        $.ajax({
            url: "/get-lists", // Update to your Flask API URL
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({
                limit: 50,  // Adjust the limit as needed
                skip: 0
            }),
            success: function (response) {
                let dropdown = $("#list-dropdown");
                dropdown.empty(); // clear existing options
                dropdown.append('<option value="">Select a List</option>'); // Default option

                if (response.success) {
                    response.lists.forEach(function (x) {
                        console.log(x)
                        dropdown.append(`<option value="${x.data.filename}" data-text="${x.data.id}">${x.data.filename} - ${x.data.listSample} - ${x.data.count}</option>`);
                        // console.log("list data for "+x.data.id+" is "+JSON.stringify(x.data));
                        listData[x.data.filename] = x.data;
                    });

                } else {
                    dropdown.append('<option value="">Error loading lists</option>');
                }
            },
            error: function (e) {
                console.log(e)
                $("#list-dropdown").html('<option value="">Failed to load lists</option>');
            }
        });

        // Populate the existing template
        $('#campaign-dropdown').on("change",function(){
            let templateId = $(this).val();
            console.log('name:'+templateId);
            $.ajax({
                url: "/get-campaign", // Update to your Flask API URL
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify({
                    templateId:templateId
                }),
                success: function (response) {
                    let iframe = document.getElementById('campaign-preview');
                    let doc = iframe.contentDocument || iframe.contentWindow.document;

                    iframe.onload = function() {
                        iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 10 + 'px';

                        iframe.style.width  = iframe.contentWindow.document.body.scrollWidth + 'px';
                    }
                    doc.open();
                    let htmlContent = response.data;
                    doc.write(htmlContent);
                    doc.close();
                    /*
                     setTimeout(() => {
                        iframe.style.height=0;
                        iframe.style.width=0;
                        let body = doc.body, html = doc.documentElement;
                        let height = Math.max(body.scrollHeight, body.offsetHeight,
                                              html.clientHeight, html.scrollHeight, html.offsetHeight);
                        let width = Math.max(body.scrollWidth, body.offsetWidth,
                                              html.clientWidth, html.scrollWidth, html.offsetWidth);
                         let buffer = 200;
                        iframe.style.height = buffer + height + "px";
                        iframe.style.width =  width + "px";
                    }, 50);*/
                },
                error: function () {
                    $("#campaign-dropdown").html('<option value="">Failed to load campaigns</option>');
                }
            });

 




        });

        // Populate #example-data when a list is selected
        $("#list-dropdown").on("change", function() {
            let selectedId = $(this).val();
            try {
                let array = listData[selectedId].emails;
                let selectedElements = array.length >= 3 ? array.slice(0, 3) : array;
                let preview="";
                selectedElements.forEach(x=>{preview += x+"<br/>"});
                $("#example-data").html(preview);
                $("#download-list").show().css('display','inline-block');
            } catch {
                $("#example-data").text("Charlie done messed up boiyi");
                
            }

        });

        // Download exact file from the server
        $("#download-list").on("click", function() {
            let selectedId = $("#list-dropdown").val();
            console.log("id:"+selectedId);
            if (!selectedId || !listData[selectedId]?.filename) {
                alert("No file available for download");
                return;
            }

            let filename = listData[selectedId].filename;
            window.location.href = `/download-list/${filename}`; // Adjust API route as needed
        });
    }

    // Load campaigns on page load
    loadCampaigns();
    loadLists();
    loadFroms();
});

function RunCampaign(){
    console.log("run");
    const data = ValidateFormData({test:false});
    if (data == false) return;
    let reader = new FileReader();
    contacts = []
    let count = listData[data.csvFileName].count;
    if (confirm("Are you sure you want to send the "+data.campaign+" campaign to "+count+" contacts:\n"+
    "from:"+data.from+"\n"+
    "subject:"+data.subject+"\n"+
    "including:"+listData[data.csvFileName].listSample+"\n"+
    "..?")){

          $.ajax({
            url: "/run-campaign", // Update to your Flask API URL
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function (response) {
                if (response.success){
                    console.log("S:"+JSON.stringify(response));

                } else {
                alert(response.message);
                
                }
            },
            error: function (response) {
                console.log(JSON.parse(JSON.stringify(response)).message);
                console.log(response);
                console.log("er:"+JSON.stringify(response));
            }

        });
 
        console.log('ok');
    }

}

function ValidateFormData(args={}){
    const {test=true} = args;
    let campaign = $('#campaign-dropdown').val();
    let from = $('#from-dropdown').val();
    let subject = $('#subject-line').val();
    let testEmails  = $('#test-emails').val();
    let csvFileName = "none"
    let contactCount = 0;
    let contactSample = "";
    if (!test){
        csvFileName = $('#list-dropdown').val(); 
        if (csvFileName == ""){

            alert("No csv was selected.");
            return false;
        } else {
            listData[csvFileName];
        }
    } else {
        if (!testEmails.includes('@')){
            alert("No test email receipients!");
            return false;
            
        }

    }
    
    
    if (campaign == "") {
        alert("No campaign!");
        return false;
    }

    if (from == "") {
        alert("No from address!");
        return false;
    }

    if (subject == ""){
        alert("No subject!");
        return false;
    }

    const data = {
        campaign : campaign, 
        from : from, 
        subject : subject, 
        recipients : testEmails, 
        csvFileName : csvFileName,
    }
    return data; 

}


