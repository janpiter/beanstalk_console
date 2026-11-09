$(document).ready(
        function () {

            var timer;
            var tubeBulkStatusTimer;
            var pendingTubeBulkAction = null;
            var tubeBulkActionPending = false;
            var kickMoreInputValue = '10';
            var doAutoRefresh = false;

            const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
            const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

            __init();

            function setAutoRefreshUrl(enabled) {
                var currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('auto_refresh', enabled ? 'true' : 'false');
                window.history.replaceState(null, '', currentUrl);
            }

            function updateTubeFilterStickyOffset() {
                var $navbar = $('nav.navbar.sticky-top:visible').first();
                var navbarHeight = $navbar.length ? Math.ceil($navbar.outerHeight()) : 0;
                document.documentElement.style.setProperty('--tube-filter-sticky-top', navbarHeight + 'px');
            }

            function showTubeBulkAlert(message, variant, duration) {
                var $container = $('#tubeBulkActionAlert');
                if (!$container.length) {
                    return;
                }

                clearTimeout(tubeBulkStatusTimer);
                var $alert = $('<div>', {
                    class: 'alert alert-' + variant + ' alert-dismissible fade show shadow-lg mb-0',
                    role: 'alert'
                });
                if (variant === 'info' && message.slice(-1) === '…') {
                    $('<span>', {
                        class: 'spinner-border spinner-border-sm me-2',
                        'aria-hidden': 'true'
                    }).appendTo($alert);
                }
                $('<span>').text(message).appendTo($alert);
                $('<button>', {
                    type: 'button',
                    class: 'btn-close',
                    'aria-label': 'Dismiss notification'
                }).on('click', function() {
                    clearTimeout(tubeBulkStatusTimer);
                    $container.addClass('d-none').empty();
                }).appendTo($alert);
                $container.empty().removeClass('d-none').append($alert);

                if (duration > 0) {
                    tubeBulkStatusTimer = setTimeout(function() {
                        $container.addClass('d-none').empty();
                    }, duration);
                }
            }

            function updateTubeSelectionUi() {
                var $rows = $('#idAllTubes tbody tr');
                var $selected = $rows.find('.tube-row-select:checked');
                var visibleCount = $rows.filter(':visible').length;
                var selectedVisibleCount = $rows.filter(':visible').find('.tube-row-select:checked').length;
                var hiddenSelectedCount = $selected.length - selectedVisibleCount;
                var $bulkActions = $('#tubeBulkActions');

                $('#tubeSelectionSummary').text(
                    $selected.length + ' tube' + ($selected.length === 1 ? '' : 's') + ' selected' +
                    (hiddenSelectedCount > 0 ? ' (' + hiddenSelectedCount + ' hidden by filter)' : '')
                );
                var showBar = $selected.length > 0;
                $bulkActions.toggleClass('d-none', !showBar);
                $('body').toggleClass('has-tube-bulk-actions', showBar);
                $('#kickOneSelectedTubes, #kickMoreSelectedTubes, #kickAllSelectedTubes, #pauseSelectedTubes, #resumeSelectedTubes')
                    .prop('disabled', tubeBulkActionPending || $selected.length === 0);
                $('#selectVisibleTubes, .tube-row-select, #kickSelectedCount')
                    .prop('disabled', tubeBulkActionPending);

                if (showBar) {
                    window.requestAnimationFrame(function() {
                        document.documentElement.style.setProperty('--tube-bulk-space', ($bulkActions.outerHeight() + 16) + 'px');
                    });
                } else {
                    document.documentElement.style.removeProperty('--tube-bulk-space');
                }

                var $selectVisible = $('#selectVisibleTubes');
                $selectVisible.prop('checked', visibleCount > 0 && selectedVisibleCount === visibleCount);
                $selectVisible.prop('indeterminate', selectedVisibleCount > 0 && selectedVisibleCount < visibleCount);
            }

            function applyTubeBulkResults(results, operation) {
                var succeeded = 0;
                var kicked = 0;
                var failures = [];

                results.forEach(function(result) {
                    if (!result.success) {
                        failures.push(result.tube + ': ' + (result.message || 'Request failed'));
                        return;
                    }

                    succeeded++;
                    kicked += parseInt(result.kicked, 10) || 0;
                    var $row = $('#idAllTubes tbody tr').filter(function() {
                        return $(this).find('.tube-row-select').val() === result.tube;
                    });
                    var $pauseTime = $row.find('.td-pause-time-left');

                    if (operation === 'kick') {
                        return;
                    } else if (operation === 'pause') {
                        var seconds = parseInt($.cookie('tubePauseSeconds'), 10) || 3600;
                        $row.addClass('tr-tube-paused').attr('title', 'Pause seconds left: ' + seconds);
                        if (!$row.find('.tube-paused-indicator').length) {
                            $('<span>', {
                                class: 'tube-paused-indicator',
                                role: 'img',
                                'aria-label': 'Paused, ' + seconds + ' seconds remaining',
                                title: 'Paused · ' + seconds + ' seconds remaining'
                            }).append($('<i>', { class: 'ri-pause-mini-fill', 'aria-hidden': 'true' }))
                              .appendTo($row.find('.tube-name-content'));
                        } else {
                            $row.find('.tube-paused-indicator')
                                .attr('title', 'Paused · ' + seconds + ' seconds remaining')
                                .attr('aria-label', 'Paused, ' + seconds + ' seconds remaining');
                        }
                        $pauseTime.text(seconds).addClass('hasValue');
                    } else {
                        $row.removeClass('tr-tube-paused').removeAttr('title');
                        $row.find('.tube-paused-indicator').remove();
                        $pauseTime.text('0').removeClass('hasValue');
                    }
                });

                var message;
                if (operation === 'kick') {
                    message = kicked === 0
                        ? 'No buried jobs to kick in ' + succeeded + ' selected tube' + (succeeded === 1 ? '' : 's') + '.'
                        : 'Kicked ' + kicked + ' buried job' + (kicked === 1 ? '' : 's') + ' across ' + succeeded + ' tube' + (succeeded === 1 ? '' : 's') + '.';
                } else {
                    message = (operation === 'pause' ? 'Paused ' : 'Resumed ') + succeeded + ' of ' + results.length + ' selected tubes.';
                }
                if (failures.length) {
                    message += ' Failed: ' + failures.join('; ');
                }
                showTubeBulkAlert(message, failures.length ? 'warning' : (operation === 'kick' && kicked === 0 ? 'info' : 'success'), 7000);

                if (failures.length) {
                    results.filter(function(result) { return result.success; }).forEach(function(result) {
                        $('#idAllTubes .tube-row-select').filter(function() {
                            return $(this).val() === result.tube;
                        }).prop('checked', false);
                    });
                } else {
                    $('#idAllTubes .tube-row-select, #selectVisibleTubes').prop('checked', false);
                }
                $('#selectVisibleTubes').prop('indeterminate', false);
                updateTubeSelectionUi();
            }

            function __init() {
                updateTubeFilterStickyOffset();
                $(window).on('resize', updateTubeFilterStickyOffset);
                $('#navbarSupportedContent').on('shown.bs.collapse hidden.bs.collapse', updateTubeFilterStickyOffset);

                $('#servers-add .btn-add-server').click(function () {
                    addServer($('#host').val(), $('#port').val());
                    $("#host,#port").val('');
                    $('#servers-add').modal('hide');
                    window.location.href = window.location.href;
                    return false;
                });
                $('#addJob').on('click', function () {
                    $('#modalAddJob').modal('toggle');
                    return false;
                });
                $('#filterServer input[type=checkbox]').click(function () {
                    $('table')
                            .find('[name=' + $(this).attr('name') + ']')
                            .toggle($(this).is(':checked'));
                    var names = [];
                    $('#filterServer input:checked').each(function () {
                        names.push($(this).attr('name'));
                    });
                    names = names.filter(function (itm, i, a) {
                        return i == a.indexOf(itm);
                    });
                    $.cookie($('#filterServer').data('cookie'), names, {expires: 365});
                    $('.row-full').attr('colspan', names.length);
                });
                $('#filter input[type=checkbox]').click(function () {
                    $('table')
                            .find('[name=' + $(this).attr('name') + ']')
                            .toggle($(this).is(':checked'));
                    var names = [];
                    $('#filter input:checked').each(function () {
                        names.push($(this).attr('name'));
                    });
                    names = names.filter(function (itm, i, a) {
                        return i == a.indexOf(itm);
                    });
                    $.cookie($('#filter').data('cookie'), names, {expires: 365});
                    $('.row-full').attr('colspan', names.length);
                });

                $('#tubeSave').on('click', function () {
                    var result = addNewJob();

                    if (result == 'empty') {
                        $('#tubeSaveAlert').fadeIn('fast');
                    } else {
                        $('#modalAddJob').modal('toggle');
                    }

                    return false;
                });

                $('#autoRefresh').on('click', function () {
                    if (!$('#autoRefresh').hasClass('btn-success')) {
                        reloader({
                            'action': 'reloader',
                            'tplMain': 'ajax',
                            'tplBlock': 'allTubes',
                            'secondary': new Date().getTime()
                        }, {
                            'containerClass': '#idAllTubes',
                            'containerClassCopy': '#idAllTubesCopy',
                        });
                        $('#autoRefresh').toggleClass('btn-success');
                        setAutoRefreshUrl(true);
                    } else {
                        clearTimeout(timer);
                        doAutoRefresh = false;
                        $('#autoRefresh').toggleClass('btn-success');
                        setAutoRefreshUrl(false);
                    }
                    return false;
                });
                $('#autoRefreshSummary').on('click', function () {
                    if (!$('#autoRefreshSummary').hasClass('btn-success')) {
                        reloader({
                            'action': 'reloader',
                            'tplMain': 'ajax',
                            'tplBlock': 'serversList',
                            'secondary': new Date().getTime()
                        }, {
                            'containerClass': '#idServers',
                            'containerClassCopy': '#idServersCopy',
                        });
                        $('#autoRefreshSummary').toggleClass('btn-success');
                        setAutoRefreshUrl(true);
                    } else {
                        clearTimeout(timer);
                        doAutoRefresh = false;
                        $('#autoRefreshSummary').toggleClass('btn-success');
                        setAutoRefreshUrl(false);
                    }
                    return false;
                });

                if (contentType == 'json') {
                    $('pre code').each(function () {
                        var cn = $(this).html();
                        var jn = formatJson(cn);
                        $(this).html(jn);
                    });
                }

                $('#clearTubesSelect').on('click', function () {
                    $('#clear-tubes input[type=checkbox]:regex(name,' + $("#tubeSelector").val() + ')').prop('checked', true);
                    $.cookie("tubeSelector", $("#tubeSelector").val(), {
                        expires: 365
                    });
                    $('#clearTubes').text('Clear ' + $('#clear-tubes input[type=checkbox]:checked').length + ' selected tubes');
                });

                $('#clearTubes').on('click', function () {
                    clearTubes();
                });

                $('#settings input').on('change', function () {
                    var val;
                    if ($(this).attr('type') == 'checkbox') {
                        if ($(this).is(':checked')) {
                            val = $(this).val();
                        } else {
                            val = null;
                        }
                    } else {
                        val = $(this).val();
                    }
                    if (jQuery.inArray(this.id, ['isDisabledUnserialization', 'isDisabledJsonDecode', 'isDisabledJobDataHighlight']) >= 0)
                        val = $(this).is(':checked') ? null : 1;
                    if (jQuery.inArray(this.id, ['isEnabledAutoRefreshLoad', 'isEnabledBase64Decode']) >= 0)
                        val = $(this).is(':checked') ? 1 : null;
                    $.cookie(this.id, val, {expires: 365});
                });

                $('.addSample').on('click', function () {
                    var selectedText = "";
                    if (typeof window.getSelection != "undefined") {
                        var sel = window.getSelection();
                        if (sel.rangeCount) {
                            var container = document.createElement("div");
                            for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                                container.appendChild(sel.getRangeAt(i).cloneContents());
                            }
                            selectedText = container.textContent || container.innerText;
                        }
                    } else
                    if (typeof document.selection != "undefined") {
                        if (document.selection.type == "Text") {
                            selectedText = document.selection.createRange().htmlText;
                        }
                    }
                    $('#addsamplename').val(selectedText);
                    $('#addsamplejobid').val($(this).data('jobid'));
                    $('#modalAddSample').modal('toggle');
                    return false;
                });

                $('#sampleSave').on('click', function () {
                    addSampleJob();
                    return false;
                });

                $('.moveJobsNewTubeName').click(function (e) {
                    e.stopPropagation();
                });

                $('.moveJobsNewTubeName').keypress(function (e) {
                    if (e.which == 13) {
                        if ($(this).val().length > 0) {
                            console.log($(this).data('href') + encodeURIComponent($(this).val()));
                        }
                        document.location.replace($(this).data('href') + ($(this).val()));
                    }
                });

                $('.btn-move-all-job').click(function(e) {
                    var st = $(this).data('state');
                    $(`#modal-move-job-${st}`).modal('show')
                });
                
                $(`[name=new-tube]`).click(function(e) {
                    var state = $(this).data('state')
                    var radio_tube = `[id=modal-move-job-${state}] input[name=existing-tube]`
                    $(radio_tube).removeAttr("checked")
                });

                $(`.btn-move-job`).click(function(e) {
                    var state = $(this).data('state')
                    var new_tube = $(`[id=modal-move-job-${state}] [name=new-tube]`)
                    var radio_tube = `[id=modal-move-job-${state}] input[name=existing-tube]`
                    var alert = `[id=modal-move-job-${state}] .alert-move-job`
                    var existing_tube = $(`${radio_tube}:checked`).val()

                    if (existing_tube) {
                        document.location.replace(existing_tube)
                    } else if (new_tube.val()) {
                        link = `${new_tube.data('href')}${new_tube.val()}`
                        document.location.replace(link)
                    } else {
                        $(alert).removeClass('d-none')
                    }
                });

                if ($('#searchTubes').is(':visible')) { // Check if the element is visible
                    window.addEventListener("keydown",function (e) {
                        var target = e.target;
                        var targetIsControl = target && target.closest && target.closest('input, textarea, select, button, [contenteditable="true"], [role="textbox"]');
                        if (!targetIsControl && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
                            // Check if a single alphanumeric key was pressed
                            if (!$('#searchTubes').is(":focus") && !$('body').hasClass('modal-open')) {
                                e.preventDefault();
                                $('#searchTubes').focus();
                                // Optionally, append the pressed key to the search field
                                $('#searchTubes').val($('#searchTubes').val() + e.key);
                            }
                    }});
                }

                var $searchTubesInput = $('#searchTubes');
                var $clearSearchBtn = $searchTubesInput.siblings('.clear-search'); // Use siblings() relative to input
                var tubeFilterParam = new URLSearchParams(window.location.search).get('filter');
                if (tubeFilterParam !== null) {
                    $searchTubesInput.val(tubeFilterParam);
                }

                // Function to toggle clear button visibility
                function toggleClearButton() {
                    var value = $.trim($searchTubesInput.val() || '');
                    var hasFilter = value.length > 0;
                    $clearSearchBtn.toggleClass('d-none', !hasFilter);
                }

                // Show/hide button on input/keyup
                $searchTubesInput.on('input keyup', function() {
                    toggleClearButton();
                });

                // Clear input and hide button on click
                $clearSearchBtn.on('click', function() {
                    $searchTubesInput.val('').focus(); // Clear input and refocus
                    $searchTubesInput.trigger('input');
                });

                $('#idAllTubes').on('change', '.tube-row-select', function() {
                    updateTubeSelectionUi();
                });

                $('#idAllTubes').on('change', '#selectVisibleTubes', function() {
                    var checked = $(this).is(':checked');
                    $('#idAllTubes tbody tr:visible .tube-row-select').prop('checked', checked);
                    updateTubeSelectionUi();
                });

                function submitTubeBulkAction(operation, kickMode, count) {
                    if (tubeBulkActionPending) {
                        return;
                    }
                    var selectedTubes = $('#idAllTubes .tube-row-select:checked').map(function() {
                        return $(this).val();
                    }).get();
                    if (!selectedTubes.length) {
                        return;
                    }

                    var actionLabel;
                    var actionTitle;
                    var confirmLabel;
                    var confirmClass;
                    if (operation === 'kick') {
                        actionTitle = 'Kick buried jobs';
                        actionLabel = kickMode === 'all'
                            ? 'Kick all buried jobs from ' + selectedTubes.length + ' selected tubes?'
                            : 'Kick up to ' + count + ' buried job' + (count === 1 ? '' : 's') + ' from each of ' + selectedTubes.length + ' selected tubes?';
                        confirmLabel = 'Kick jobs';
                        confirmClass = 'btn-warning';
                    } else {
                        actionTitle = operation === 'pause' ? 'Pause tubes' : 'Resume tubes';
                        actionLabel = (operation === 'pause' ? 'Pause job reservations on ' : 'Resume job reservations on ') + selectedTubes.length + ' selected tubes?';
                        confirmLabel = operation === 'pause' ? 'Pause tubes' : 'Resume tubes';
                        confirmClass = operation === 'pause' ? 'btn-primary' : 'btn-success';
                    }

                    var detailLabel;
                    if (operation === 'kick') {
                        detailLabel = 'Buried jobs will return to the ready queue.';
                    } else if (operation === 'pause') {
                        detailLabel = 'Pause duration: ' + (parseInt($.cookie('tubePauseSeconds'), 10) || 3600) + ' seconds.';
                    } else {
                        detailLabel = 'The current pause will be cleared.';
                    }
                    pendingTubeBulkAction = {
                        operation: operation,
                        kickMode: kickMode,
                        count: count,
                        tubes: selectedTubes
                    };
                    $('#tubeBulkConfirmTitle').text(actionTitle);
                    $('#tubeBulkConfirmMessage').text(actionLabel);
                    $('#tubeBulkConfirmDetail').text(detailLabel);
                    var $tubeList = $('#tubeBulkConfirmTubes').empty();
                    selectedTubes.forEach(function(tubeName) {
                        $('<li>', { class: 'tube-bulk-confirm-tube' }).text(tubeName).appendTo($tubeList);
                    });
                    $('#confirmTubeBulkAction')
                        .removeClass('btn-primary btn-success btn-warning btn-danger')
                        .addClass(confirmClass)
                        .text(confirmLabel);
                    $('#tubeBulkConfirmModal').modal('show');
                }

                function executeTubeBulkAction(action) {
                    if (tubeBulkActionPending) {
                        return;
                    }
                    tubeBulkActionPending = true;
                    var operation = action.operation;
                    var kickMode = action.kickMode;
                    var count = action.count;
                    var selectedTubes = action.tubes;

                    var requestUrl = new URL(window.location.href);
                    requestUrl.searchParams.set('action', 'tubeBulk');
                    requestUrl.searchParams.delete('tube');
                    requestUrl.searchParams.delete('state');
                    requestUrl.searchParams.delete('filter');
                    requestUrl.searchParams.delete('auto_refresh');

                    updateTubeSelectionUi();
                    showTubeBulkAlert(operation === 'kick'
                        ? 'Kicking buried jobs from ' + selectedTubes.length + ' tubes…'
                        : (operation === 'pause' ? 'Pausing ' : 'Resuming ') + selectedTubes.length + ' tubes…', 'info', 0);

                    var postData = { operation: operation, tubes: selectedTubes };
                    if (operation === 'kick') {
                        postData.kick_mode = kickMode;
                        postData.count = count || 0;
                    }

                    $.ajax({
                        url: requestUrl.toString(),
                        type: 'POST',
                        dataType: 'json',
                        data: postData,
                        success: function(response) {
                            if (response && Array.isArray(response.results)) {
                                applyTubeBulkResults(response.results, operation);
                            } else {
                                showTubeBulkAlert('The server returned an unexpected response.', 'danger', 7000);
                            }
                        },
                        error: function(xhr) {
                            var message = xhr.responseJSON && xhr.responseJSON.error
                                ? xhr.responseJSON.error
                                : 'Could not update the selected tubes. Please try again.';
                            showTubeBulkAlert(message, 'danger', 7000);
                        },
                        complete: function() {
                            tubeBulkActionPending = false;
                            updateTubeSelectionUi();
                        }
                    });
                }

                $('#confirmTubeBulkAction').on('click', function() {
                    if (!pendingTubeBulkAction || tubeBulkActionPending) {
                        return;
                    }
                    var action = pendingTubeBulkAction;
                    pendingTubeBulkAction = null;
                    $('#tubeBulkConfirmModal').modal('hide');
                    executeTubeBulkAction(action);
                });
                $('#tubeBulkConfirmModal').on('hidden.bs.modal', function() {
                    pendingTubeBulkAction = null;
                });

                $(document).on('click', '#kickOneSelectedTubes', function() {
                    submitTubeBulkAction('kick', 'limit', 1);
                });
                $(document).on('click', '#kickMoreSelectedTubes', function() {
                    var count = parseInt($('#kickSelectedCount').val(), 10);
                    if (!Number.isInteger(count) || count < 1) {
                        showTubeBulkAlert('Enter a kick count of at least 1.', 'warning', 5000);
                        return;
                    }
                    submitTubeBulkAction('kick', 'limit', count);
                });
                if ($('#kickSelectedCount').length) {
                    kickMoreInputValue = $('#kickSelectedCount').val();
                }
                $(document).on('input change', '#kickSelectedCount', function() {
                    kickMoreInputValue = $(this).val();
                });
                $(document).on('keydown', '#kickSelectedCount', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        $('#kickMoreSelectedTubes').trigger('click');
                    }
                });
                $(document).on('click', '#kickAllSelectedTubes', function() {
                    submitTubeBulkAction('kick', 'all', 0);
                });
                $(document).on('click', '#pauseSelectedTubes', function() {
                    submitTubeBulkAction('pause');
                });
                $(document).on('click', '#resumeSelectedTubes', function() {
                    submitTubeBulkAction('resume');
                });

                $(window).on('resize', updateTubeSelectionUi);

                // Initial check in case the input field is pre-filled on page load
                toggleClearButton();


                $('#searchTubes').on('input keyup', function() {
                    var pattern = $.trim($(this).val());
                    var matcher = null;
                    var currentUrl = new URL(window.location.href);

                    if (pattern) {
                        currentUrl.searchParams.set('filter', $(this).val());
                    } else {
                        currentUrl.searchParams.delete('filter');
                    }
                    window.history.replaceState(null, '', currentUrl);

                    if (pattern) {
                        // Support regular expressions and the familiar * wildcard.
                        // If other regex operators are present, preserve standard regex semantics.
                        var hasRegexSyntax = /[.|+?^${}()[\]\\]/.test(pattern);
                        var regexPattern = hasRegexSyntax ? pattern : pattern.replace(/\*/g, '.*');
                        try {
                            matcher = new RegExp(regexPattern, 'i');
                        } catch (e) {
                            // Treat malformed expressions as literal text, retaining * wildcards.
                            regexPattern = pattern
                                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                                .replace(/\\\*/g, '.*');
                            matcher = new RegExp(regexPattern, 'i');
                        }
                    }

                    var $tubeRows = $('#idAllTubes tbody tr');
                    var matchedCount = 0;

                    $tubeRows.each(function() {
                        var tubeName = $(this).find('.tube-name-cell a').text().trim();
                        var matches = !matcher || matcher.test(tubeName);
                        $(this).toggle(matches);
                        if (matches) {
                            matchedCount++;
                        }
                    });

                    var totalCount = $tubeRows.length;
                    var countInfo = pattern
                        ? matchedCount + ' of ' + totalCount + ' tubes match · ' + totalCount + ' total tubes'
                        : totalCount + ' total tubes';
                    $('#tubeCountInfo').text(countInfo);
                    updateTubeSelectionUi();
                });

                if (tubeFilterParam !== null) {
                    $searchTubesInput.trigger('input');
                }
                
                $(document)
                .on('shown.bs.modal', '[id^=modal-move-job]', function(e) {
                })
                .on('hidden.bs.modal', '[id^=modal-move-job]', function(e) {
                    var state = $(this).data('state')
                    $(`[id=modal-move-job-${state}] [name=new-tube]`).val('')
                    $(`[id=modal-move-job-${state}] input[name=existing-tube]`).removeAttr("checked")
                    $(`[id=modal-move-job-${state}] .alert-move-job`).addClass('d-none')
                })
                .on('click', '#addServer', function () {
                    $('#servers-add').modal('toggle');
                    return false;
                });
                $('.ellipsize').on('dblclick', function () {
                    $(this).toggleClass('ellipsize');
                });
                $('.kick_jobs_no').on('change', function () {
                    if (typeof (Storage) != "undefined") {
                        localStorage.setItem($(this).attr('id'), $(this).val());
                    }
                });
                if (typeof (Storage) != "undefined") {
                    $('.kick_jobs_no').each(function () {
                        $(this).val(localStorage.getItem($(this).attr('id')) || 10);
                    });
                }

                var autoRefreshParam = new URLSearchParams(window.location.search).get('auto_refresh');
                var shouldAutoRefresh = autoRefreshParam === null
                    ? Boolean($.cookie('isEnabledAutoRefreshLoad'))
                    : autoRefreshParam.toLowerCase() === 'true';

                if (shouldAutoRefresh) {
                    if ($('#autoRefresh').length) {
                        $('#autoRefresh').click();
                    }
                    if ($('#autoRefreshSummary').length) {
                        $('#autoRefreshSummary').click();
                    }
                }
            }

            function copyToClipboard(elementId, attr) {
                var element = document.getElementById(elementId);
                var dataUrl = element.getAttribute(attr);

                // Create a temporary input element
                var tempInput = document.createElement('textarea');
                tempInput.value = dataUrl;

                // Append the input element to the document
                document.body.appendChild(tempInput);
                tempInput.select();

                // Execute the copy command
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                try {
                    navigator.clipboard.writeText(dataUrl);
                } catch(err) {
                    console.log(err);
                }
            }

            function addServer(host, port) {
                if (host) {
                    myCoockie = $.cookie("beansServers");
                    if (myCoockie == null) {
                        server = host + ":" + port;
                    } else {
                        server = myCoockie + ";" + host + ":" + port;
                    }
                    $.cookie("beansServers", server, {
                        expires: 365
                    });
                } else {
                    alert("Some fields empty..");
                }
            }

            function addNewJob() {

                if (!$('#tubeName').val() || !$('#tubeData').val()) {
                    return 'empty';
                }

                var params = {
                    'tubeName': $('#tubeName').val(),
                    'tubeData': $('#tubeData').val(),
                    'tubePriority': $('#tubePriority').val(),
                    'tubeDelay': $('#tubeDelay').val(),
                    'tubeTtr': $('#tubeTtr').val()
                }

                $.ajax({
                    'url': url + '&action=addjob',
                    'data': params,
                    'success': function (data) {
                        var result = data.result;
                        cleanFormNewJob();
                        location.reload();
                    },
                    'type': 'POST',
                    'dataType': 'json',
                    'error': function () {
                        console.log('error ajax...');
                    }
                });
            }

            function cleanFormNewJob() {
                // $('#tubeName').val('');
                $('#tubeData').val('');
                $('#tubePriority').val('');
                $('#tubeDelay').val('');
                $('#tubeTtr').val('');
            }

            function formatJson(val) {

                var retval = '';
                var str = val;
                var pos = 0;
                var strLen = str.length;
                var indentStr = '    ';
                var newLine = "\n";
                var char = '';

                for (var i = 0; i < strLen; i++) {
                    char = str.substring(i, i + 1);
                    nextChar = str.substring(i + 1, i + 2);
                    if ((char == '}' || char == ']') && nextChar != newLine) {

                        retval = retval + newLine;
                        pos = pos - 1;
                        for (var j = 0; j < pos; j++) {
                            retval = retval + indentStr;
                        }
                    }
                    retval = retval + char;

                    if ((char == '{' || char == '[' || char == ',') && nextChar != newLine) {
                        retval = retval + newLine;
                        if (char == '{' || char == '[') {
                            pos = pos + 1;
                        }

                        for (var k = 0; k < pos; k++) {
                            retval = retval + indentStr;
                        }
                    }
                }

                return retval;

            }

            function reloader(params, options) {
                doAutoRefresh = true;
                $.ajax({
                    'url': url,
                    'data': params,
                    'success': function (data) {
                        if (doAutoRefresh) {
                            var ms = 500;
                            if ($.cookie('autoRefreshTimeoutMs')) {
                                ms = parseInt($.cookie('autoRefreshTimeoutMs'));
                            }
                            if (ms < 200) {
                                ms = 200;
                            }
                            // wrapping all of this to prevent last update
                            // after you turn it off
                            var selectedTubeNames = $('#idAllTubes .tube-row-select:checked').map(function() {
                                return $(this).val();
                            }).get();
                            var kickCountHadFocus = document.activeElement && document.activeElement.id === 'kickSelectedCount';
                            var html = $(options.containerClass).html();
                            $(options.containerClass).html(data);
                            $(options.containerClassCopy).html(html);
                            $('#kickSelectedCount').val(kickMoreInputValue);
                            if (kickCountHadFocus) {
                                $('#kickSelectedCount').trigger('focus');
                            }
                            selectedTubeNames.forEach(function(tubeName) {
                                $('#idAllTubes .tube-row-select').filter(function() {
                                    return $(this).val() === tubeName;
                                }).prop('checked', true);
                            });
                            updateTubeSelectionUi();
                            updateTable(options.containerClass, options.containerClassCopy);
                            $('#searchTubes').trigger('keyup');
                            timer = setTimeout(reloader, ms, params, options);
                        }
                    },
                    'type': 'GET',
                    'dataType': 'html',
                    'error': function () {
                        console.log('error ajax...');
                    }
                });
            }

            function updateTable(containerClass, containerClassCopy) {
                var td1 = $(containerClass + ' table').find('td'), td2 = $(containerClassCopy + ' table').find('td');
                for (i = 0, il = td1.length; i < il; i++) {
                    if (typeof td2[i] === 'undefined' || typeof td1[i] === 'undefined') {                    // tube is missing
                        continue;
                    }
                    var l = td1[i].innerText || td1[i].innerHTML || td1[i].textContent;
                    var r = td2[i].innerText || td2[i].innerHTML || td2[i].textContent;
                    if (l.trim() != r.trim()) {
                        var $td1 = $(td1[i]), color = $td1.css('background-color');
                        $td1.css({
                            'background-color': '#1d788a',
                            'border-radius': '11px',
                        }).animate({
                            'background-color': color,
                        }, 500);
                        if (l.trim() != '0') {
                            $td1.addClass('hasValue');
                        }
                        else {
                            $td1.removeClass('hasValue');
                        }
                    }
                }
            }

            function clearTubes() {
                if ($('#clear-tubes input[type=checkbox]:checked').length === 0) {
                    return;
                }

                $.ajax({
                    'url': url + '&action=clearTubes',
                    'data': $('#clear-tubes input[type=checkbox]:checked').serialize(),
                    'success': function (data) {
                        var result = data.result;
                        location.reload();
                    },
                    'type': 'POST',
                    'error': function () {
                        alert('error from ajax (clear might take a while, be patient)...');
                    }
                });
            }

            function addSampleJob() {
                if (!$('#addsamplename').val() || $('input[name^=tube]:checked').length < 1) {
                    $('#sampleSaveAlert span').text('Required fields are marked *');
                    $('#sampleSaveAlert').fadeIn('fast');
                    return;
                }

                $.ajax({
                    'url': url + '&action=addSample',
                    'data': $('#modalAddSample input').serialize(),
                    'success': function (data) {
                        console.log(data);
                        if (data.result) {
                            $('#modalAddSample').modal('toggle');
                        } else {
                            $('#sampleSaveAlert span').text(data.error);
                            $('#sampleSaveAlert').fadeIn('fast');
                        }
                    },
                    'type': 'POST',
                    'dataType': 'json',
                    'error': function () {
                        alert('error ajax...');
                    }
                });
            }

            function jsonFormatter(state) {
                let searchParams = new URLSearchParams(window.location.search)
                if (searchParams.get('tube')) {
                    var json_el = $(`.json-viewer.${state}`);
                    var json_text = json_el.attr('data-json');
                    if (json_text) {
                        try {
                            json_el.jsonViewer(JSON.parse(json_text), {
                            });
                        } catch(err) {
                            json_el.html(json_text)
                        }
                    }
                }
            }

            function copyJob() {
                $(`.btn-copy-job`).click(function() {
                    var state = $(this).data('state')
                    copyToClipboard(`json-viewer-${state}`, 'data-json')
                    $(`#json-viewer-${state}`).popover('show')
                    setTimeout(function() {
                        $(`#json-viewer-${state}`).popover('hide')
                    }, 2000)
                })
            }

            function fullScreen(state) {
                // card-job-<?php echo $state ?>

                $(`.btn-expand.${state}`).click(function() {
                    var json_el = $(`.json-viewer.${state}`)
                    var json_text = json_el.attr('data-json')
                    if (json_text) {
                        $('#modalJob').removeClass('d-none')
                        try {
                            $('#modalJob .job-data-expanded').jsonViewer(JSON.parse(json_text), {
                            });
                        } catch(err) {
                            $('#modalJob .job-data-expanded').html(json_text)
                        }
                    }
                })
            }

            jsonFormatter('ready');
            jsonFormatter('delayed');
            jsonFormatter('buried');

            copyJob();

            // fullScreen('ready');
            // fullScreen('delayed');
            // fullScreen('buried');

        }
);

// Scroll To Top
$(window).scroll(function() {
   if($(window).scrollTop() > 100) {
       $('.scroll-top').removeClass('d-none');
   } else {
       $('.scroll-top').addClass('d-none');
   }
});
$('.scroll-top').click(function () {
    window.scrollTo({top: 0, behavior: 'smooth'});
});

