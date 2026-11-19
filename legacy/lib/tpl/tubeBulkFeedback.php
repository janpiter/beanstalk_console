<div id="tubeBulkActionAlert" class="tube-bulk-alert d-none" aria-live="polite" aria-atomic="true"></div>

<div class="modal fade" id="tubeBulkConfirmModal" tabindex="-1" aria-labelledby="tubeBulkConfirmTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="tubeBulkConfirmTitle">Confirm action</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p id="tubeBulkConfirmMessage" class="mb-2"></p>
                <div id="tubeBulkConfirmDetail" class="small text-body-secondary mb-2"></div>
                <ul id="tubeBulkConfirmTubes" class="tube-bulk-confirm-tubes list-unstyled mb-0"></ul>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary btn-sm" id="confirmTubeBulkAction">Confirm</button>
            </div>
        </div>
    </div>
</div>
