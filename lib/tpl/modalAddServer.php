<div id="servers-add" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="servers-add-label" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="servers-add-labal">Add Server</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form class="form-horizontal">
                    <div class="form-group">
                        <label class="control-label col-sm-2" for="host">Host</label>

                        <div class="col">
                            <input type="text" id="host" value="localhost" class="form-control">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="control-label col-sm-2" for="port">Port</label>

                        <div class="col">
                            <input type="text" id="port" value="<?php echo Pheanstalk::DEFAULT_PORT ?>" class="form-control">
                        </div>
                    </div>


                </form>
            </div>
            <div class="modal-footer">
                <button class="btn" data-bs-dismiss="modal" aria-hidden="true">Cancel</button>
                <button class="btn btn-info">Save</button>
            </div>
        </div>
    </div>

</div>