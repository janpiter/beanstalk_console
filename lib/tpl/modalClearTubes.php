<div class="modal fade" id="clear-tubes" data-cookie="tubefilter" tabindex="-1" role="dialog" aria-labelledby="clear-tubes-label" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="clear-tubes-label">Clear multiple tubes</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form>
                    <fieldset>
                        <div class="form-group">
                            <label for="focusedInput">Tube name
                                <small class="text-muted">(supports <a href="http://james.padolsey.com/javascript/regex-selector-for-jquery/" target="_blank">jQuery
                                        regexp</a> syntax)
                                </small>
                            </label>

                            <div class="input-group">
                                <input class="form-control focused" id="tubeSelector" type="text" placeholder="prefix*"
                                       value="<?php echo @$_COOKIE['tubeSelector']; ?>">

                                <div class="input-group-btn">
                                    <a href="#" class="btn btn-info" id="clearTubesSelect">Select</a>
                                </div>

                            </div>

                        </div>
                    </fieldset>
                    <div class="mt-2">
                        <strong>Tube list</strong>
                        <?php
                        foreach ((is_array($tubes) ? $tubes : array()) as $tube):
                            ?>
                            <div class="form-check">
                                <input id="t-<?php echo $tube ?>" type="checkbox" name="<?php echo $tube ?>" value="1" class="form-check-input">
                                <label class="form-check-label" for="t-<?php echo $tube ?>">
                                    <?php echo $tube ?>
                                </label>
                            </div>
                        <?php endforeach ?>
                    </div>
                </form>
            </div>
            <div class="modal-footer">

                <button type="button" class="btn btn-default" data-bs-dismiss="modal">Close</button>
                <a href="#" class="btn btn-success" id="clearTubes">Clear selected tubes</a>
                <br/><br/>

                <p class="text-muted text-right small">
                    * Tube clear works by peeking to all jobs and deleting them in a loop.
                </p>
            </div>
        </div>
    </div>
</div>