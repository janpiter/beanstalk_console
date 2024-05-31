<section class="jobsShowcase">

<div class="row mt-3 mb-5 pb-5">
<div class="col">

<div class="row g-2 mt-0">

    <?php foreach ((array) $peek as $state => $job): 
        switch ($state) {
            case 'ready':
                $color = '#198754';
                break;
            case 'delayed':
                $color = '#d7be3a';
                break;
            default:
                $color = '#e685b5';
                break;
        }
    ?>
        <div class="col-12 col-sm-4">
        <div class="card bg-body border-0 shadow-sm">
        <div class="card-body">        
            <a id="current-jobs-<?php echo $state ?>"></a>
            <div class="text-start">
                <h5 class="mb-2 fw-bold d-inline">Next job in <span style="color:<?php echo $color?>"><?php echo $state ?></span> state</h5>
                <?php if ($job): ?>
                    <div class="dropdown float-end">
                        <button class="btn btn-default btn-sm border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-target="#opt-<?php echo $state; ?>">
                            <i class="ri-more-fill"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end" id="opt-<?php echo $state; ?>">
                            <li>
                                <a data-bs-toggle="tooltip" data-bs-title="Delete all <?php echo $state ?> jobs" class="dropdown-item fs-14px" href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&state=<?php echo $state ?>&action=deleteAll&count=1" onclick="return confirm('This process might hang a while on tubes with lots of jobs. Are you sure you want to continue?');">
                                    Delete all <?php echo $state ?> jobs
                               </a>
                            </li>
                            <li>
                               <a class="dropdown-item fs-14px btn-move-all-job" type="button" data-state="<?php echo $state ?>">
                                Move all <?php echo $state ?> to ..
                               </a>
                            </li>
                        </ul>
                    </div>
                <?php endif ?>
                <hr>
            </div>
            <div class="clearfix"></div>
            <?php if ($job): ?>

                <div class="row show-grid">
                    <div class="col-sm-12">
                        
                        <div class="row g-2">
                            <?php 
                            $keys_2 = array(
                                'id' => array('name' => 'ID', 'icon' => 'ri-key-fill'), 
                                'pri' => array('name' => 'Priority', 'icon' => 'ri-skip-up-line'), 
                                'ttr' => array('name' => 'TTR', 'icon' => 'ri-history-line'),

                                'file' => array('name' => 'File', 'icon' => 'ri-file-paper-2-line'),
                                'reserves' => array('name' => 'Reserves', 'icon' => 'ri-restart-line'),
                                'timeouts' => array('name' => 'Timeouts', 'icon' => 'ri-pulse-fill'),
                                'releases' => array('name' => 'Releases', 'icon' => 'ri-arrow-go-forward-fill'),
                                'buries' => array('name' => 'Buries', 'icon' => 'ri-fire-line'),
                                'kicks' => array('name' => 'Kicks', 'icon' => 'ri-speed-mini-fill'),
                            );
                            foreach ($keys_2 as $k => $v) { ?>
                                <div class="col-md-4 col-6">
                                    <small class="text-body-tertiary fs-11px fw-semibold">
                                        <small>
                                            <i class="fw-normal <?php echo $v['icon'] ?>"></i>
                                            <?php echo $v['name'] ?>
                                        </small>
                                    </small>
                                    <p class="mb-0 fs-13px item text-body">
                                        <?php echo $job['stats'][$k] ?>
                                    </p>
                                </div>
                            <?php }
                            ?>
                        </div>
                        <div class="row g-2 mt-1">
                            <?php 
                            $keys_1 = array('age', 'delay', 'time-left');
                            foreach ($keys_1 as $k1) { 
                                switch ($k1) {
                                    case 'age':
                                        $icon = '<i class="ri-time-line fw-normal"></i>';
                                        break;
                                    case 'delay':
                                        $icon = '<i class="ri-rest-time-line fw-normal"></i>';
                                        break;
                                    default:
                                        $icon = '<i class="ri-compass-2-line fw-normal"></i>';
                                        break;
                                }
                            ?>
                                <div class="col-md-4 col-12">
                                    <small class="text-body-tertiary fs-11px fw-semibold">
                                        <small>
                                            <?php echo $icon ?>
                                            <?php echo str_replace('-', ' ', ucfirst($k1)) ?>
                                        </small>
                                    </small>
                                    <p class="mb-0 fs-13px item text-body" style="line-height: 1.5;min-height: 39px">
                                        <?php 
                                            $age = $job['stats'][$k1];
                                            $days = floor($age / 86400);
                                            $hours = floor($age / 3600) % 24;
                                            $minutes = floor($age / 60) % 60;
                                            $seconds = floor($age % 60);

                                            if (($days + $hours + $minutes + $seconds) > 0) {
                                                echo $days > 0 ? $days.' days ' : '';
                                                echo $hours > 0 ? $hours.' hours ' : '';
                                                echo $minutes > 0 ? $minutes.' minutes ' : '';
                                                echo $seconds > 0 ? $seconds.' seconds ' : '';
                                            } else {
                                                echo "0";
                                            }
                                        ?>
                                    </p>
                                </div>
                            <?php } ?>
                        </div>

                    </div>
                    <div class="col-sm-12 mt-2">
                        <?php if ($job): ?>
                            <div class="row g-2">
                                <div class="col-12">
                                    <small class="text-body-tertiary fs-11px fw-semibold">
                                        <i class="ri-stock-line fw-normal"></i>
                                        Job Data
                                    </small>
                                </div>
                                <div class="col-12">
                                    <div class="card bg-black bg-opacity-25 border-0">
                                        <div class="card-body card-job-<?php echo $state ?>">
                                            <div class="row">
                                                <div class="col-8 text-start d-inline">
                                                    <a class="btn btn-sm btn-dark addSample" data-jobid="<?php echo $job['id']; ?>" data-bs-toggle="tooltip" data-bs-title="Add to samples" href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&action=addSample">
                                                       <i class="ri-add-line"></i>
                                                   </a>
                                                   <button class="btn btn-copy <?php echo $state ?> btn-dark btn-sm" data-bs-toggle="tooltip" data-bs-title="Copy to clipboard">
                                                        <i class="ri-file-copy-line"></i>
                                                    </button>
                                                </div>
                                                <div class="col-4 text-end d-inline">
                                                    <a data-bs-toggle="tooltip" data-bs-title="Delete job" class="btn btn-sm bg-danger bg-opacity-50"
                                                       href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&state=<?php echo $state ?>&action=deleteJob&jobid=<?php echo $job['id']; ?>">
                                                       <i class="ri-delete-back-2-line"></i> 
                                                   </a>
                                                </div>
                                                <div class="col-12 json">
                                                    <pre id="json-viewer-<?php echo $state ?>" class="json-viewer mb-0 <?php echo $state ?> rounded-2 mt-2" data-bs-custom-class="custom-popover" data-bs-toggle="popover" data-bs-placement="top" data-bs-content="Job data copied to clipboard" data-json="<?php echo htmlspecialchars($job['data']) ?>" style="max-height: 500px;overflow-y: scroll;font-size: 12px!important">
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        <?php endif; ?>

                    </div>
                </div>

                <?php if ($job) { ?>
                    <!-- Modal -->
                    <div class="modal fade" id="modal-move-job-<?php echo $state ?>" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true" data-state="<?php echo $state ?>">
                        <div class="modal-dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h1 class="modal-title fs-5" id="exampleModalLabel">Move all <?php echo $state ?> jobs</h1>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body"> 
                                    <div>
                                        <div class="alert alert-danger alert-dismissible alert-move-job d-none px-2 py-1" role="alert">
                                            Destination tube required!
                                            <button type="button" class="btn-close p-2 fs-14px" data-bs-dismiss="alert" aria-label="Close"></button>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="new-<?php echo $state ?>-tube" class="form-label">New tube</label>
                                        <input type="text" class="form-control form-control-sm" id="new-<?php echo $state ?>-tube" name="new-tube" data-state="<?php echo $state ?>" data-href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&action=moveJobsTo&state=<?php echo $state; ?>&destTube=" placeholder="New tube name">
                                    </div>
                                    <div>
                                        <label class="form-label">Existing tube</label>
                                        <div class="row">
                                            <div class="col-12" style="max-height: 250px;overflow-y: scroll;">
                                                <?php 
                                                if (isset($tubes) && is_array($tubes) && count($tubes)) {
                                                    foreach ($tubes as $key => $name) { ?>
                                                    <div class="form-check">
                                                        <input class="form-check-input" type="radio" name="existing-tube" value="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&action=moveJobsTo&destTube=<?php echo $name; ?>&state=<?php echo $state; ?>" id="tb-<?php echo $state ?>-<?php echo $name ?>">
                                                        <label class="form-check-label fs-14px" for="tb-<?php echo $state ?>-<?php echo $name ?>"><?php echo htmlspecialchars($name); ?></label>
                                                    </div>
                                                <?php } } ?>
                                                <?php if ($state == 'ready') { ?>
                                                    <div class="form-check">
                                                        <input class="form-check-input" type="radio" name="existing-tube" value="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&action=moveJobsTo&destState=buried&state=<?php echo $state; ?>" id="tb-<?php echo $state ?>-buried">
                                                        <label class="form-check-label fs-14px" for="tb-<?php echo $state ?>-buried">buried</label>
                                                    </div>
                                                <?php } ?>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Close</button>
                                    <button type="button" class="btn btn-success btn-sm btn-move-job" data-state="<?php echo $state ?>">Move</button>
                                </div>
                            </div>
                        </div>
                    </div>

                <?php } ?>
            <?php else: ?>
                <div class="row">
                    <div class="col text-center">
                        <img src="assets/empty.svg" class="img-fluid pt-2 opacity-25" alt="Empty" width="200">
                        <h6 class="text-body-tertiary m-0 pb-3">Empty</h6>
                    </div>
                </div>
            <?php endif ?>

        </div>
        </div>
        </div>
    <?php endforeach ?>

</div>
</div>
</div>
</div>
</div>
</section>

<div id="modalJob" class="d-none w-100 position-absolute start-0 top-0 bg-black" style="height: auto;z-index: 9999">
  <div class="job-data-expanded bg-black m-2 p-2 rounded-2 fs-13px"></div>
</div>
