<div class="modal fade" id="modalAddJob" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Add new job</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form class="form-horizontal">
                    <fieldset>
                        <div class="alert alert-error d-none" id="tubeSaveAlert">
                            <strong>Error!</strong> Required fields are marked *
                        </div>

                        <div>
                            <label class="form-label col" for="focusedInput">*Tube name</label>

                            <div class="col">
                                <input class="form-control form-control-sm focused" id="tubeName" type="text" value="<?php echo $tube ?>">
                            </div>
                        </div>

                        <div class="mt-3">
                            <label class="form-label col" for="textarea">*Data</label>

                            <div class="col">
                                <textarea id="tubeData" rows="3" class="form-control form-control-sm"></textarea>
                            </div>
                        </div>
                        <div class="mt-3">
                            <label class="form-label col" for="focusedInput">Priority</label>

                            <div class="col">
                                <input class="form-control form-control-sm focused" id="tubePriority" type="text" value="">
                            </div>
                        </div>
                        <div class="mt-3">
                            <label class="form-label col" for="focusedInput">Delay</label>

                            <div class="col">
                                <input class="form-control form-control-sm focused" id="tubeDelay" type="text" value="">
                            </div>
                        </div>
                        <div class="mt-3">
                            <label class="form-label col" for="focusedInput">Ttr</label>

                            <div class="col">
                                <input class="form-control form-control-sm focused" id="tubeTtr" type="text" value="">
                            </div>
                        </div>
            </div>
            <div class="modal-footer">
                <a href="#" class="btn btn-sm" data-bs-dismiss="modal">Close</a>
                <a href="#" class="btn btn-sm btn-success" id="tubeSave">Save changes</a>
            </div>
            </fieldset>
            </form>
        </div>
    </div>
</div>