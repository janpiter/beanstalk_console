<?php
$sampleJobs = $console->getSampleJobs($tube);
$buriedJobsCount = $allStats['current-jobs-buried'];

if (!@empty($_COOKIE['tubePauseSeconds'])) {
    $tubePauseSeconds = intval($_COOKIE['tubePauseSeconds']);
} else {
    $tubePauseSeconds = 3600;
}
?>
<section id="actionsRow">
    <div class="row">
        <div class="col text-end">
            <div class="card  rounded-bottom-2 rounded-top-0 bg-body border-0 shadow-sm">
            <div class="card-body pt-0">
            
            <div class="row g-1">
                <div class="col-md-2 col-12">
                    <a class="btn btn-default btn-sm bg-black  w-100" href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&action=kick&count=1"><i class="ri-speed-mini-fill"></i> Kick 1 job</a>
                </div>
                <div class="col-md-2 col-12">

                    <form method="GET">
                        <div class="input-group input-group-sm">
                            <button type="submit" class="btn btn-default bg-black btn-sm col-7" id="button-addon1"><i class="ri-forward-end-mini-fill"></i> Kick more </button>
                            <input type="hidden" name="server" value="<?php echo $server ?>">
                            <input type="hidden" name="tube" value="<?php echo urlencode($tube) ?>">
                            <input type="hidden" name="action" value="kick">
                            <input id="kick_tube_no_<?php echo md5($tube);?>" type="number" value="10" name="count" min="0" step="1" size="4" class="form-control form-control-sm border border-black bg-black bg-opacity-25 kick_jobs_no col-5" aria-describedby="button-addon1">
                        </div>

                    </form>
                </div>

                <div class="col-md-2 col-12">
                    <a class="btn btn-default btn-sm bg-black w-100" href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&action=kick&count=<?=$buriedJobsCount?>"><i class="ri-speed-mini-fill"></i> Kick all jobs</a>
                </div>
                <div class="col-md-2 col-12 text-start">
                    <?php
                    if (empty($tubeStats['pause-time-left'])) {
                        ?><a class="btn btn-default btn-sm bg-black w-100" href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&action=pause&count=-1"
                           title="Temporarily prevent jobs being reserved from the given tube. Pause for: <?php echo $tubePauseSeconds; ?> seconds"><i class="ri-pause-mini-fill"></i>
                            Pause tube</a><?php
                    } else {
                        ?><a class="btn btn-default btn-sm bg-black w-100" href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&action=pause&count=0"
                           title="<?php echo sprintf('Pause seconds left: %d', $tubeStats['pause-time-left']); ?>"><i class="ri-play-mini-fill"></i> Unpause tube</a><?php
                    }
                    ?>
                </div>
                <div class="col-md-4 col-12 text-end">
                    <div class="btn-group">
                        <a data-toggle="modal" class="btn btn-success btn-sm" href="#" id="addJob"><i class="ri-add-circle-fill"></i> Add job</a>
                        <button class="btn btn-success btn-sm dropdown-toggle" data-bs-toggle="dropdown">
                            <span class="caret"></span>
                        </button>
                        <ul class="dropdown-menu">

                            <?php
                            if (is_array($sampleJobs) && count($sampleJobs)) {
                                foreach ($sampleJobs as $key => $name) {
                                    ?>
                                    <li>
                                        <a class="dropdown-item" href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&action=loadSample&key=<?php echo urlencode($key); ?>"><?php echo htmlspecialchars($name); ?></a>
                                    </li>
                                    <?php
                                }
                                ?>
                                <li class="divider"></li>
                                <li><a class="dropdown-item" href="./?action=manageSamples">Manage samples</a></li>
                                <?php
                            } else {
                                ?>
                                <li>
                                    <a class="dropdown-item" href="#">There are no sample jobs</a>
                                </li>
                            <?php } ?>
                        </ul>
                    </div>
                </div>
            </div>
            </div>
        </div>
        </div>
    </div>
</section>
