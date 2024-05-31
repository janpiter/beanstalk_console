<div id="modalAddSample" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="settings-label" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 id="settings-label" class="modal-title">Add to samples</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" name="tube" value="<?php echo $tube; ?>"/>
                <fieldset>
                    <div class="alert alert-error d-none" id="sampleSaveAlert">
                        <span><strong>Error!</strong> Required fields are marked *</span>
                    </div>
                    <input type="hidden" name="addsamplejobid" id="addsamplejobid">

                    <div>
                        <label class="form-label" for="addsamplename"
                               title="You can highlight text inside the job, then hit the Add button, it will be automatically populated here."><b>Name *</b>
                            <i>(highlighted text is auto populated)</i></label>
                        <input class="form-control form-control-sm focused" id="addsamplename" name="addsamplename" type="text" value="" autocomplete="off">
                    </div>
                </fieldset>
                <div class="mt-3">
                    <label class="form-label" for="focusedInput"><b>Available on tubes *</label>
                    <div style="max-height: 250px;overflow-y: scroll;">
                        <?php
                        foreach ($tubes as $t):
                            $checked = '';
                            if ($t == $tube) {
                                $checked = 'checked="checked"';
                            }
                            ?>
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input" autocomplete="off" name="tubes[<?php echo $t ?>]" id="move-<?php echo $t ?>" value="1" <?php echo $checked; ?>>
                                <label class="form-check-label align-top ps-1" for="move-<?php echo $t ?>">
                                    <?php echo $t ?>
                                </label>
                            </div>
                        <?php endforeach ?>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-sm btn-secondary" data-bs-dismiss="modal" aria-hidden="true">Close</button>
                <a href="#" class="btn btn-sm btn-success" id="sampleSave">Save</a>
            </div>
        </div>
    </div>
</div>