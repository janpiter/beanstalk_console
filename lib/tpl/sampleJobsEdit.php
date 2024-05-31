<?php
if (isset($isNewRecord) && $isNewRecord) {
    $action = '?action=newSample';
} else {
    $action = '?action=editSample&key=' . urlencode($_GET['key']);
}
?>

 <div class="row">
    <div class="col-md-12 col-12 mt-4 pb-4 mb-4">
        <div class="card bg-body border-0 shadow-sm">
            <div class="card-body">

                <form name="sampleJobsEdit" action="<?php echo $action; ?>" method="POST">
                    <div class="">
                        <div class="pull-left">
                            <?php
                            if (isset($isNewRecord) && $isNewRecord) {
                                ?>
                                <h5>New sample job</h5>
                                <?php
                            } else {
                                ?>
                                <h5>Edit - <?php echo htmlspecialchars($job['name']); ?></h5>
                            <?php } ?>
                        </div>
                        <div class="position-absolute end-0 top-0 mt-3 me-3">
                            <a href="./?action=manageSamples" class="btn btn-default bg-black bg-opacity-50 btn-sm"><i class="ri-list-check"></i> Manage samples</a>
                        </div>
                        <hr>
                    </div>
                    <div class="">
                        <fieldset>
                            <?php
                            if (isset($error)) {
                                ?>
                                <div class="alert alert-error">
                                    <span> <?php echo $error; ?></span>
                                </div>
                            <?php } ?>
                            <div>
                                <label class="form-label" for="addsamplename"><b>Name *</b></label>
                                <input class="form-control form-control-sm focused" id="addsamplename" name="name" type="text" value="<?php echo @htmlspecialchars($job['name']); ?>" autocomplete="off">
                            </div>
                        </fieldset>
                        <div class="mt-3">
                            <label class="form-label" for="focusedInput"><b>Available on tubes *</b></label>
                            <div class="row">
                                <?php
                                if (isset($job) && is_array($job['tubes'])) {
                                    ?>
                                    <div class="col-12">
                                        <label class="form-label">Saved to</label>
                                        <?php
                                        foreach ($job['tubes'] as $t => $val) {
                                            $checked = '';
                                            if (@array_key_exists($t, $job['tubes'])) {
                                                $checked = 'checked="checked"';
                                            }
                                            ?>
                                            <div class="card">
                                                <div class="card-body px-3 py-2">
                                                    <div class="form-check">
                                                        <input type="checkbox" class="form-check-input" autocomplete="off" name="tubes[<?php echo $t ?>]" value="1" id="st-<?php echo $t ?>" <?php echo $checked; ?>>
                                                        <label class="form-check-label w-100" for="st-<?php echo $t ?>">
                                                            <?php echo $t ?>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                            <?php
                                        }
                                        ?>
                                    </div>
                                    <?php
                                }
                                if (is_array($serverTubes)) {
                                    foreach ($serverTubes as $server => $tubes) {
                                        if (is_array($tubes)) {
                                            ?>
                                            <div class="col-12 mt-3">
                                                <div class="card">
                                                    <div class="card-body bg-black rounded-top-2 bg-opacity-50">
                                                        <p class="m-0"><?php echo $server; ?></p>
                                                    </div>
                                                    <div class="card-body">
                                                        <div class="col-12">
                                                            <div class="row g-1" style="max-height: 300px;overflow-y: scroll;">
                                                                <?php
                                                                foreach ($tubes as $t) {
                                                                    $checked = '';
                                                                    if (@array_key_exists($t, $job['tubes'])) {
                                                                        $checked = 'checked="checked"';
                                                                    }
                                                                    ?>
                                                                    <div class="col-sm-3 col-12">
                                                                        <div class="card">
                                                                            <div class="card-body px-2 py-1">
                                                                                <div class="form-check">
                                                                                    <input type="checkbox" class="form-check-input" autocomplete="off" name="tubes[<?php echo $t ?>]" value="1" <?php echo $checked; ?> id="at-<?php echo $t ?>">
                                                                                    <label class="form-check-label " for="at-<?php echo $t ?>">
                                                                                        <?php echo $t ?>
                                                                                    </label>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <?php
                                                                }
                                                                ?>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <?php
                                        }
                                    }
                                }
                                ?>
                            </div>
                        </div>
                        <div class="mt-3">
                            <label class="form-label" for="jobdata"><b>Job data *</b></label>
                            <textarea class="form-control form-control-sm" name="jobdata" id="jobdata" style="width:100%" rows="6"><?php echo @htmlspecialchars($job['data']); ?></textarea>
                        </div>
                    </div>
                    <div class="mt-3 text-end">
                        <input type="submit" class="btn btn-sm btn-success" value="Save"/>
                    </div>
                </form>

            </div>
        </div>
    </div>
</div>
