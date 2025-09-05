/**
 * Main JavaScript file for Tej IT Solutions Billing System
 */

// Global application object
const TejBilling = {
    init: function() {
        this.initComponents();
        this.bindEvents();
        this.handleFlashMessages();
    },

    initComponents: function() {
        // Initialize tooltips
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });

        // Initialize popovers
        var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
        popoverTriggerList.map(function (popoverTriggerEl) {
            return new bootstrap.Popover(popoverTriggerEl);
        });

        // Initialize data tables if available
        if (typeof $.fn.DataTable !== 'undefined') {
            $('.datatable').DataTable({
                responsive: true,
                pageLength: 25,
                order: [[0, 'desc']],
                language: {
                    search: "_INPUT_",
                    searchPlaceholder: "Search records..."
                }
            });
        }
    },

    bindEvents: function() {
        // Confirm delete actions
        $(document).on('click', '[data-confirm]', function(e) {
            e.preventDefault();
            const message = $(this).data('confirm') || 'Are you sure you want to delete this item?';
            const href = $(this).attr('href');
            
            if (confirm(message)) {
                if ($(this).is('form')) {
                    $(this).submit();
                } else {
                    window.location.href = href;
                }
            }
        });

        // Handle form submissions with loading states
        $('form[data-loading]').on('submit', function() {
            const $form = $(this);
            const $submitBtn = $form.find('button[type="submit"]');
            const originalText = $submitBtn.text();
            
            $submitBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Processing...');
            
            // Re-enable after 10 seconds as fallback
            setTimeout(() => {
                $submitBtn.prop('disabled', false).text(originalText);
            }, 10000);
        });

        // Auto-hide alerts after 5 seconds
        $('.alert[data-auto-dismiss]').each(function() {
            const $alert = $(this);
            setTimeout(() => {
                $alert.fadeOut();
            }, 5000);
        });

        // Number formatting
        $('.currency-input').on('input', function() {
            let value = $(this).val().replace(/[^\d.]/g, '');
            if (value) {
                $(this).val(parseFloat(value).toFixed(2));
            }
        });

        // Copy to clipboard functionality
        $(document).on('click', '[data-clipboard]', function(e) {
            e.preventDefault();
            const text = $(this).data('clipboard');
            navigator.clipboard.writeText(text).then(() => {
                this.showToast('Copied to clipboard!', 'success');
            });
        });
    },

    handleFlashMessages: function() {
        // Add auto-dismiss to flash messages
        $('.alert').attr('data-auto-dismiss', 'true');
    },

    showToast: function(message, type = 'info') {
        const toastHtml = `
            <div class="toast align-items-center text-white bg-${type} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        // Create toast container if it doesn't exist
        if (!$('#toast-container').length) {
            $('body').append('<div id="toast-container" class="toast-container position-fixed top-0 end-0 p-3"></div>');
        }

        const $toast = $(toastHtml);
        $('#toast-container').append($toast);

        const toast = new bootstrap.Toast($toast[0]);
        toast.show();

        // Remove toast element after it's hidden
        $toast.on('hidden.bs.toast', function() {
            $(this).remove();
        });
    },

    // Utility functions
    formatCurrency: function(amount, currency = 'USD') {
        const symbols = { 'USD': '$', 'INR': '₹' };
        const symbol = symbols[currency] || currency;
        return `${symbol}${parseFloat(amount).toFixed(2)}`;
    },

    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // AJAX helper
    ajaxRequest: function(url, data = {}, method = 'GET') {
        return $.ajax({
            url: url,
            method: method,
            data: data,
            dataType: 'json',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
    }
};

// Invoice specific functions
const InvoiceManager = {
    calculateLineTotal: function(quantity, rate) {
        return (parseFloat(quantity) || 0) * (parseFloat(rate) || 0);
    },

    updateInvoiceTotals: function() {
        let subtotal = 0;
        $('.line-item-row').each(function() {
            const quantity = parseFloat($(this).find('.quantity-input').val()) || 0;
            const rate = parseFloat($(this).find('.rate-input').val()) || 0;
            const lineTotal = quantity * rate;
            
            $(this).find('.line-total').text(TejBilling.formatCurrency(lineTotal));
            subtotal += lineTotal;
        });

        const gstRate = parseFloat($('#gst-rate').val()) || 0;
        const gstAmount = subtotal * (gstRate / 100);
        const total = subtotal + gstAmount;

        $('#subtotal').text(TejBilling.formatCurrency(subtotal));
        $('#gst-amount').text(TejBilling.formatCurrency(gstAmount));
        $('#total-amount').text(TejBilling.formatCurrency(total));
    },

    addLineItem: function() {
        const template = $('#line-item-template').html();
        const $newRow = $(template);
        $('#line-items-container').append($newRow);
        this.bindLineItemEvents($newRow);
    },

    removeLineItem: function($row) {
        if ($('.line-item-row').length > 1) {
            $row.remove();
            this.updateInvoiceTotals();
        } else {
            TejBilling.showToast('At least one line item is required', 'warning');
        }
    },

    bindLineItemEvents: function($row) {
        const self = this;
        
        $row.find('.quantity-input, .rate-input').on('input', function() {
            self.updateInvoiceTotals();
        });

        $row.find('.remove-line-item').on('click', function(e) {
            e.preventDefault();
            self.removeLineItem($row);
        });

        $row.find('.service-select').on('change', function() {
            const serviceId = $(this).val();
            if (serviceId) {
                // Fetch service details and populate rate
                TejBilling.ajaxRequest(`/services/api/services?id=${serviceId}`)
                    .done(function(data) {
                        if (data.length > 0) {
                            const service = data[0];
                            const currency = $('#invoice-currency').val();
                            const rate = currency === 'USD' ? service.usd_rate : service.inr_rate;
                            
                            $row.find('.rate-input').val(rate);
                            $row.find('.description-input').val(service.description);
                            self.updateInvoiceTotals();
                        }
                    });
            }
        });
    }
};

// Client management functions
const ClientManager = {
    loadClientDetails: function(clientId) {
        return TejBilling.ajaxRequest(`/clients/${clientId}`)
            .done(function(data) {
                // Populate client details in form
                const client = data.client;
                $('#client-name').val(client.name);
                $('#client-email').val(client.email);
                $('#client-currency').val(client.currency_preference);
                $('#payment-terms').val(client.payment_terms);
            });
    },

    validateClientForm: function() {
        let isValid = true;
        const required = ['name', 'email'];
        
        required.forEach(field => {
            const $field = $(`#${field}`);
            if (!$field.val().trim()) {
                $field.addClass('is-invalid');
                isValid = false;
            } else {
                $field.removeClass('is-invalid');
            }
        });

        // Email validation
        const email = $('#email').val();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            $('#email').addClass('is-invalid');
            isValid = false;
        }

        return isValid;
    }
};

// Reports functions
const ReportsManager = {
    exportReport: function(reportType, format = 'csv') {
        const url = `/reports/export/${reportType}?format=${format}`;
        window.open(url, '_blank');
    },

    loadReportData: function(reportType, filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return TejBilling.ajaxRequest(`/reports/${reportType}?${queryParams}`);
    },

    initDateRangePicker: function() {
        if (typeof $.fn.daterangepicker !== 'undefined') {
            $('.date-range-picker').daterangepicker({
                locale: {
                    format: 'YYYY-MM-DD'
                },
                startDate: moment().subtract(29, 'days'),
                endDate: moment()
            });
        }
    }
};

// Admin functions
const AdminManager = {
    delegateAdmin: function(userId, days) {
        return TejBilling.ajaxRequest('/admin/delegate-admin', {
            user_id: userId,
            duration_days: days
        }, 'POST');
    },

    backupDatabase: function() {
        if (confirm('Are you sure you want to create a database backup?')) {
            return TejBilling.ajaxRequest('/admin/backup-database', {}, 'POST')
                .done(function(data) {
                    TejBilling.showToast(data.message, 'success');
                })
                .fail(function(xhr) {
                    const error = xhr.responseJSON?.error || 'Backup failed';
                    TejBilling.showToast(error, 'error');
                });
        }
    },

    fetchExchangeRate: function() {
        return TejBilling.ajaxRequest('/admin/exchange-rates/fetch-latest', {}, 'POST')
            .done(function(data) {
                TejBilling.showToast(`Exchange rate updated: ${data.rate}`, 'success');
                location.reload();
            });
    }
};

// Initialize when document is ready
$(document).ready(function() {
    TejBilling.init();

    // Page-specific initializations
    if ($('body').hasClass('invoice-page')) {
        InvoiceManager.updateInvoiceTotals();
        
        $(document).on('click', '#add-line-item', function(e) {
            e.preventDefault();
            InvoiceManager.addLineItem();
        });
    }

    if ($('body').hasClass('reports-page')) {
        ReportsManager.initDateRangePicker();
    }

    // Global keyboard shortcuts
    $(document).keydown(function(e) {
        // Ctrl+S to save forms
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            $('form[data-shortcut="save"]').submit();
        }
        
        // Escape to close modals
        if (e.keyCode === 27) {
            $('.modal.show').modal('hide');
        }
    });
});

// Export global objects
window.TejBilling = TejBilling;
window.InvoiceManager = InvoiceManager;
window.ClientManager = ClientManager;
window.ReportsManager = ReportsManager;
window.AdminManager = AdminManager;