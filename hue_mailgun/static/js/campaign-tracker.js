// Campaign tracker functionality
let listData = {};
const activeCampaignTrackers = {};

// Tab functionality
$(document).ready(function() {
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
    
    // Start campaign button
    $("#start-campaign").click(function () {
        RunCampaign();
    });
});

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