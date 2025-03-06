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
        $.post("/run-test", $("#campaign-form").serialize(), function (data) {
            $("#test-results").html(data);
        });
    });
    
    $("#start-campaign").click(function () {
        if (confirm("Are you sure you want to start the campaign?")) {
            $.post("/start-campaign", $("#campaign-form").serialize(), function (data) {
                $("#campaign-status").html(data);
            });
        }
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
                dropdown.empty(); // Clear existing options
                dropdown.append('<option value="">Select a List</option>'); // Default option

                if (response.success) {
                    response.lists.forEach(function (x) {
                        dropdown.append(`<option value="${x.data.id}">${x.data.listname} - ${x.data.count}</option>`);
                        // console.log("list data for "+x.data.id+" is "+JSON.stringify(x.data));
                        listData[x.data.id] = x.data;
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
                    $('#campaign-preview').html(response.data);
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
                $("#example-data").text(selectedElements);
                $("#download-list").show();
            } catch {
                $("#example-data").text("Charlie done messed up boiyi");
                
            }

        });

        // Download exact file from the server
        $("#download-list").on("click", function() {
            let selectedId = $("#list-dropdown").val();
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
