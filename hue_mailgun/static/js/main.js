$(document).ready(function () {
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


    $("#fetch-campaigns").click(function () {
        $.ajax({
            url: "http://127.0.0.1:5000/get-campaigns", // Adjust to your Flask backend URL
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({
                limit: 10,
                skip: 0
            }),
            success: function (response) {
                $("#campaign-list").empty(); // Clear existing list
                if (response.success) {
                    response.campaigns.forEach(function (campaign) {
                        $("#campaign-list").append(`<li>${campaign.name}</li>`);
                    });
                } else {
                    $("#campaign-list").append("<li>Error fetching campaigns</li>");
                }
            },
            error: function () {
                alert("Failed to fetch campaigns.");
            }
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
                        dropdown.append(`<option value="${campaign.id}">${campaign.name}</option>`);
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

    // Load campaigns on page load
    loadCampaigns();
});
