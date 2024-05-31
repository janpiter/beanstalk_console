<div id="settings" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="settings-label" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="settings-label">Settings</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <fieldset>
                    <div>
                        <label class="form-label" for="tubePauseSeconds">
                            <b>Tube pause seconds</b>
                            <p class="mb-0 lh-1 text-body-tertiary"><small>(<i>-1</i> means the default: <i>3600</i>, <i>0</i> is reserved for
                            un-pause)</small></p>
                        </label>

                        <input class="form-control form-control-sm focused" id="tubePauseSeconds" type="text" value="<?php
                        if (@empty($_COOKIE['tubePauseSeconds']))
                            echo -1;
                        else
                            echo @intval($_COOKIE['tubePauseSeconds']);
                        ?>">
                    </div>
                    <div class="mt-3">
                        <label class="form-label" for="focusedInput">
                            <b>Auto-refresh interval in milliseconds</b>
                            <p class="mb-0 lh-1 text-body-tertiary"><small>(Default: <i>500</i>)</small></p>
                        </label>
                        <input class="form-control form-control-sm focused" id="autoRefreshTimeoutMs" type="text" value="<?php
                        if (@empty($_COOKIE['autoRefreshTimeoutMs']))
                            echo 500;
                        else
                            echo @intval($_COOKIE['autoRefreshTimeoutMs']);
                        ?>">
                        <div class="form-check">
                            <input type="checkbox" class="form-check-input" id="isEnabledAutoRefreshLoad" value="0"
                                       <?php if (@$_COOKIE['isEnabledAutoRefreshLoad'] == 1) { ?>checked="checked"<?php } ?>>
                            <label class="form-check-label" for="isEnabledAutoRefreshLoad">
                                Auto-refresh on load
                            </label>
                        </div>
                    </div>
                    <div class="mt-3">
                        <label class="form-label" for="focusedInput">
                            <b>Search result limits</b>
                            <p class="mb-0 lh-1 text-body-tertiary"><small>(Default: <i>25</i>)</small></p>
                        </label>
                        <input class="form-control form-control-sm focused" id="searchResultLimit" type="text" value="<?php
                        if (@empty($_COOKIE['searchResultLimit']))
                            echo 25;
                        else
                            echo @intval($_COOKIE['searchResultLimit']);
                        ?>">
                    </div>
                    <div class="form-group mt-3">
                        <label for="focusedInput"><b>Preferred way to deal with job data</b></label>

                        <div class="form-check">
                            <label>
                                <input type="checkbox" class="form-check-input" id="isDisabledJsonDecode" value="1"
                                       <?php if (@$_COOKIE['isDisabledJsonDecode'] != 1) { ?>checked="checked"<?php } ?>>
                                <label class="form-check-label" for="isDisabledJsonDecode">
                                    Before display: json_decode()
                                </label>
                            </label>
                        </div>

                        <div class="form-check">
                            <label>
                                <input type="checkbox" class="form-check-input" id="isDisabledUnserialization" value="1"
                                       <?php if (@$_COOKIE['isDisabledUnserialization'] != 1) { ?>checked="checked"<?php } ?>>
                                <label class="form-check-label" for="isDisabledUnserialization">
                                    Before display: unserialize()
                                </label>
                            </label>
                        </div>

                        <div class="form-check">
                            <label>
                                <input type="checkbox" class="form-check-input" id="isEnabledBase64Decode" value="1"
                                       <?php if (@$_COOKIE['isEnabledBase64Decode'] == 1) { ?>checked="checked"<?php } ?>>
                                <label class="form-check-label" for="isEnabledBase64Decode">
                                    Before display: base64_decode()
                                </label>
                            </label>
                        </div>

                        <div class="form-check">
                            <label>
                                <input type="checkbox" class="form-check-input" id="isDisabledJobDataHighlight" value="1"
                                       <?php if (@$_COOKIE['isDisabledJobDataHighlight'] != 1) { ?>checked="checked"<?php } ?>>
                                <label class="form-check-label" for="isDisabledJobDataHighlight">
                                    After display: enable highlight
                                </label>
                            </label>
                        </div>

                    </div>
                </fieldset>
            </div>
            <div class="modal-footer">
                <button class="btn btn-sm btn-secondary" data-bs-dismiss="modal" aria-hidden="true">Close</button>
            </div>

        </div>
    </div>
</div>