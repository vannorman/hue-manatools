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
            loadLists();
            //console.log("filename:"+file.name);
            let timeout = 200;
            if (window.location.href.includes('localhost')) timeout= 2000; // due to charlie's local refresh dev environment that auto reloads server on file changes like detecting the uploaded file. Server does not auto refresh so doesn't need much time to refresh
            setTimeout(function(){
                // because we empty list after loading new from server.
                let selected = $('#list-dropdown option').filter(function(){
                    let a = $(this).val().toLowerCase();
                    let b = file.name.toLowerCase();
                    let result = a===b;
                    return result;
                });
                setTimeout(function(){selected.prop('selected',true).trigger('change');},200);
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

    // Tab functionality
    $('.tab').click(function() {
        const tabId = $(this).data('tab');
        
        // Switch active tab
        $('.tab').removeClass('active');
        $(this).addClass('active');
        
        // Switch active panel
        $('.tab-panel').removeClass('active');
        $(`#${tabId}-panel`).addClass('active');
        
        // If switching to active campaigns tab, load the campaigns
        if (tabId === 'active-campaigns') {
            loadActiveCampaigns();
        }
    });
    
    // Modal close button
    $('.close').click(function() {
        $('#campaign-details-modal').hide();
    });
    
    // Close modal when clicking outside of it
    $(window).click(function(event) {
        if ($(event.target).hasClass('modal')) {
            $('.modal').hide();
        }
    });

    // Test button functionality
    $("#run-test").click(function () {
        let data = ValidateFormData();
        if (!data) return;
        
        $.ajax({
            url: "/run-test",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function (response) {
                if (response.success) {
                    let subject = response.result.data.subject;
                    let count = response.result.count;
                    let from = response.result.data.from;
                    let recipients = response.result.data.recipients.substr(0, 100);
                    $('#test-results').text("Success! '" + from + "' Sent '" + subject + "' to " + count + " recipients including " + recipients);
                } else {
                    $('#test-results').text("Error: " + response.message);
                }
            },
            error: function (xhr) {
                $('#test-results').text("Server error: " + xhr.responseText || "Unknown error");
            }
        });
    });
    
    // Start campaign button
    $("#start-campaign").click(function () {
        RunCampaign();
    });
    
    // Load initial data
    loadCampaigns();
    loadLists();
    loadFroms();
});

// Track active campaigns with their intervals
const activeCampaignTrackers = {};

function RunCampaign() {
    const data = ValidateFormData({test: false});
    if (data === false) return;
    
    let count = listData[data.csvFileName].count;
    const confirmMessage = `Are you sure you want to send the "${data.campaign}" campaign to ${count} contacts:
from: ${data.from}
subject: ${data.subject}
including: ${listData[data.csvFileName].listSample}
..?`;
    
    if (confirm(confirmMessage)) {
        // Show loading state
        $('#start-campaign').prop('disabled', true).text('Starting Campaign...');
        
        $.ajax({
            url: "/run-campaign",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function (response) {
                if (response.success) {
                    const campaignData = response.data;
                    
                    // Show success message
                    $('#campaign-results').html(`
                        <div class="success-message">
                            Campaign "${campaignData.campaign}" started successfully!<br>
                            Sending to ${campaignData.count} recipients with subject "${campaignData.subject}"
                        </div>
                    `);
                    
                    // Show and reset the status area
                    $('#campaign-status-area').show();
                    $('#campaign-progress-bar').css('width', '0%');
                    $('#campaign-progress-text').text('0%');
                    $('#campaign-sent-count').text('0');
                    $('#campaign-failed-count').text('0');
                    $('#campaign-current-status').text('Queued');
                    
                    // Start polling for updates
                    startCampaignStatusTracking(campaignData.campaign_id);
                    
                } else {
                    $('#campaign-results').html(`
                        <div class="error-message">
                            Error: ${response.message}
                        </div>
                    `);
                }
                
                // Reset button state
                $('#start-campaign').prop('disabled', false).text('Start Campaign');
            },
            error: function (xhr) {
                $('#campaign-results').html(`
                    <div class="error-message">
                        Server error: ${xhr.responseText || "Unknown error"}
                    </div>
                `);
                
                // Reset button state
                $('#start-campaign').prop('disabled', false).text('Start Campaign');
            }
        });
    }
}

function startCampaignStatusTracking(campaignId) {
    // Clear any existing tracker for this campaign
    if (activeCampaignTrackers[campaignId]) {
        clearInterval(activeCampaignTrackers[campaignId]);
    }
    
    // Function to update the UI with campaign status
    const updateCampaignStatus = () => {
        $.ajax({
            url: `/campaign-status/${campaignId}`,
            type: "GET",
            success: function (response) {
                if (response.success) {
                    const campaign = response.data;
                    
                    // Update progress bar
                    const progressPercent = campaign.progress_percentage;
                    $('#campaign-progress-bar').css('width', `${progressPercent}%`);
                    $('#campaign-progress-text').text(`${progressPercent}%`);
                    
                    // Update stats
                    $('#campaign-sent-count').text(campaign.success_count);
                    $('#campaign-failed-count').text(campaign.failure_count);
                    $('#campaign-current-status').text(formatStatus(campaign.status));
                    
                    // If campaign is complete or failed, stop polling
                    if (campaign.status === 'completed' || campaign.status === 'failed') {
                        clearInterval(activeCampaignTrackers[campaignId]);
                        delete activeCampaignTrackers[campaignId];
                        
                        if (campaign.status === 'completed') {
                            $('#campaign-results').append(`
                                <div class="success-message">
                                    Campaign completed at ${formatDate(campaign.updated_at)}<br>
                                    ${campaign.success_count} emails sent successfully, ${campaign.failure_count} failed
                                </div>
                            `);
                        } else {
                            $('#campaign-results').append(`
                                <div class="error-message">
                                    Campaign failed: ${campaign.error_message || "Unknown error"}<br>
                                    ${campaign.success_count} emails sent successfully, ${campaign.failure_count} failed
                                </div>
                            `);
                        }
                    }
                }
            },
            error: function () {
                console.error("Failed to get campaign status");
            }
        });
    };
    
    // Update immediately, then set interval
    updateCampaignStatus();
    activeCampaignTrackers[campaignId] = setInterval(updateCampaignStatus, 5000); // Poll every 5 seconds
}

function loadActiveCampaigns() {
    $('#active-campaigns-list').html('<div class="loader"></div>');
    
    $.ajax({
        url: "/active-campaigns",
        type: "GET",
        success: function (response) {
            if (response.success) {
                const campaigns = response.data;
                
                if (campaigns.length === 0) {
                    $('#active-campaigns-list').html('<div class="no-campaigns">No active campaigns found</div>');
                    return;
                }
                
                let html = '';
                campaigns.forEach(campaign => {
                    html += `
                        <div class="campaign-card">
                            <h3>${escapeHtml(campaign.campaign_name)}</h3>
                            <div class="campaign-meta">
                                <span>Created: ${formatDate(campaign.created_at)}</span>
                                <span>From: ${escapeHtml(campaign.from_address)}</span>
                                <span>
                                    Status: <span class="status-badge ${campaign.status}">${formatStatus(campaign.status)}</span>
                                </span>
                            </div>
                            <div>
                                <strong>Subject:</strong> ${escapeHtml(campaign.subject)}
                            </div>
                            <div>
                                <strong>List:</strong> ${escapeHtml(campaign.list_name)}
                            </div>
                            <div>
                                <strong>Progress:</strong> ${campaign.success_count} sent, ${campaign.failure_count} failed (${campaign.progress_percentage}%)
                            </div>
                            <div class="view-details" data-id="${campaign.id}">View Details</div>
                        </div>
                    `;
                });
                
                $('#active-campaigns-list').html(html);
                
                // Add event listener for "View Details" links
                $('.view-details').click(function() {
                    const campaignId = $(this).data('id');
                    viewCampaignDetails(campaignId);
                });
            } else {
                $('#active-campaigns-list').html(`<div class="error-message">Error: ${response.message}</div>`);
            }
        },
        error: function (xhr) {
            $('#active-campaigns-list').html(`<div class="error-message">Server error: ${xhr.responseText || "Unknown error"}</div>`);
        }
    });
}

function viewCampaignDetails(campaignId) {
    // Show loading state in modal
    $('#campaign-details-content').html('<div class="loader"></div>');
    $('#campaign-details-modal').show();
    
    $.ajax({
        url: `/campaign-details/${campaignId}`,
        type: "GET",
        success: function (response) {
            if (response.success) {
                const { campaign, emails } = response.data;
                
                let html = `
                    <h2>${escapeHtml(campaign.campaign_name)}</h2>
                    <div class="campaign-meta">
                        <div><strong>Status:</strong> <span class="status-badge ${campaign.status}">${formatStatus(campaign.status)}</span></div>
                        <div><strong>Created:</strong> ${formatDate(campaign.created_at)}</div>
                        <div><strong>Updated:</strong> ${formatDate(campaign.updated_at)}</div>
                    </div>
                    <div class="campaign-info">
                        <div><strong>From:</strong> ${escapeHtml(campaign.from_address)}</div>
                        <div><strong>Subject:</strong> ${escapeHtml(campaign.subject)}</div>
                        <div><strong>List:</strong> ${escapeHtml(campaign.list_name)}</div>
                        <div><strong>Recipients:</strong> ${campaign.total_recipients}</div>
                        <div><strong>Sent:</strong> ${campaign.success_count}</div>
                        <div><strong>Failed:</strong> ${campaign.failure_count}</div>
                        <div><strong>Progress:</strong> ${campaign.progress_percentage}%</div>
                    </div>
                `;
                
                if (campaign.error_message) {
                    html += `<div class="error-message"><strong>Error:</strong> ${escapeHtml(campaign.error_message)}</div>`;
                }
                
                // Add email list table
                html += `
                    <h3>Email Details</h3>
                    <table class="details-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Sent At</th>
                                <th>Error</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                emails.forEach(email => {
                    html += `
                        <tr>
                            <td>${escapeHtml(email.recipient_name || '')}</td>
                            <td>${escapeHtml(email.recipient_email)}</td>
                            <td>${formatStatus(email.status)}</td>
                            <td>${email.sent_at ? formatDate(email.sent_at) : '-'}</td>
                            <td>${email.error_message ? escapeHtml(email.error_message) : '-'}</td>
                        </tr>
                    `;
                });
                
                html += `
                        </tbody>
                    </table>
                `;
                
                $('#campaign-details-content').html(html);
            } else {
                $('#campaign-details-content').html(`<div class="error-message">Error: ${response.message}</div>`);
            }
        },
        error: function (xhr) {
            $('#campaign-details-content').html(`<div class="error-message">Server error: ${xhr.responseText || "Unknown error"}</div>`);
        }
    });
}

// Helper functions
function formatStatus(status) {
    const statusMap = {
        'pending': 'Pending',
        'in_progress': 'In Progress',
        'completed': 'Completed',
        'failed': 'Failed',
        'sent': 'Sent',
        'queued': 'Queued'
    };
    
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    return date.toLocaleString();
}

function escapeHtml(str) {
    if (!str) return '';
    
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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
   
    
    if (campaign == "") {
        alert("No campaign!");
        flashElement($('#campaign-dropdown'));
        return false;
    }
    if (!test){
        csvFileName = $('#list-dropdown').val(); 
        if (csvFileName == ""){

            alert("No csv was selected.");
            flashElement($('#list-dropdown'));
            return false;
        } else {
            listData[csvFileName];
        }
    } else {
        if (!testEmails.includes('@')){
            alert("No test email receipients!");
            flashElement($('#test-emails'));
            return false;
            
        }

    }
 
    if (from == "") {
        alert("No from address!");
        flashElement($('#from-dropdown'));
        return false;
    }

    if (subject == ""){
        alert("No subject!");
        flashElement($('#subject-line'));
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

animations = {}
function flashElement(element) {
    if (!element) return;
    if (!animations.hasOwnProperty(element)) {
        animations[element] = {
            origBg : element.css('background-color'),
            animFn : null,
        }
    }

    clearTimeout(animations[element].animFn);
    element.css('transition','all 0s')
            .css('background-color','red')
            .css('transition','all 0.3s');
    animations[element].animFn = setTimeout(function(){
        element.css('background-color',animations[element].origBg);
    },350)
}


