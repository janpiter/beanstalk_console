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
<div class="card-body" style="min-height: 924.5px">
        <!-- <div class="col-12 col-sm-12"> -->
        
            <a id="current-jobs-<?php echo $state ?>"></a>
            <div class="text-start">
                <h5 class="mb-2 fw-bold">Next job in <span style="color:<?php echo $color?>"><?php echo $state ?></span> state</h5>
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
                                                       <!-- <i class="ri-add-line"></i> Add to samples -->
                                                       <i class="ri-add-line"></i>
                                                   </a>
                                                    <div class="btn-group rounded-1" role="group" data-bs-toggle="tooltip" data-bs-title="Move all <?php echo $state ?> to">
                                                        <button class="btn btn-dark btn-sm rounded-1" type="button" data-bs-toggle="dropdown">
                                                            <i class="ri-arrow-right-fill"></i>
                                                             <!-- Move all <?php echo $state ?> to -->
                                                        </button>
                                                        <ul class="dropdown-menu" style="max-height: 300px;overflow-y: scroll;">
                                                            <li><h6 class="dropdown-header">Move all <?php echo $state ?> to</h6></li>
                                                            <li>
                                                                <span class="dropdown-item-text"><input class="moveJobsNewTubeName form-control form-control-sm" type="text" class="dropdown-item"
                                                                       data-href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&action=moveJobsTo&state=<?php echo $state; ?>&destTube="
                                                                       placeholder="New tube name"/>
                                                                </span>
                                                            </li>
                                                                <?php
                                                                if (isset($tubes) && is_array($tubes) && count($tubes)) {
                                                                    foreach ($tubes as $key => $name) {
                                                                        ?>
                                                                    <li>
                                                                        <a class="dropdown-item  fs-14px" href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&action=moveJobsTo&destTube=<?php echo $name; ?>&state=<?php echo $state; ?>"><?php echo htmlspecialchars($name); ?></a>
                                                                    </li>
                                                                    <?php
                                                                }
                                                                ?>
                                                                <?php
                                                            }
                                                            ?>
                                                            <?php
                                                            if ($state == 'ready') {
                                                                ?>
                                                                <li class="dropdown-divider"></li>
                                                                <li>
                                                                    <a class="dropdown-item" href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&action=moveJobsTo&destState=buried&state=<?php echo $state; ?>">Buried</a>
                                                                </li>
                                                                <?php
                                                            }
                                                            ?>
                                                        </ul>
                                                    </div>
                                                    <a data-bs-toggle="tooltip" data-bs-title="Delete all <?php echo $state ?> jobs" class="btn btn-sm btn-dark"
                                                       href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&state=<?php echo $state ?>&action=deleteAll&count=1"
                                                       onclick="return confirm('This process might hang a while on tubes with lots of jobs. Are you sure you want to continue?');">
                                                       <i class="ri-delete-bin-line"></i> 
                                                       <!-- Delete all <?php echo $state ?> jobs -->
                                                   </a>
                                                    <a data-bs-toggle="tooltip" data-bs-title="Delete job" class="btn btn-sm btn-dark"
                                                       href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&state=<?php echo $state ?>&action=deleteJob&jobid=<?php echo $job['id']; ?>">
                                                       <i class="ri-close-line"></i> 
                                                       <!-- Delete -->
                                                   </a>
                                                </div>
                                                <div class="col-4 text-end d-inline">
                                                    <!-- <button class="btn btn-expand <?php echo $state ?> btn-dark btn-sm" data-bs-toggle="tooltip" data-bs-title="Show in fullscreen">
                                                        <i class="ri-fullscreen-line"></i>
                                                    </button> -->
                                                    <button class="btn btn-copy <?php echo $state ?> btn-dark btn-sm" data-bs-toggle="tooltip" data-bs-title="Copy to clipboard">
                                                        <i class="ri-file-copy-line"></i>
                                                    </button>
                                                </div>
                                                <div class="col-12 json">
                                                    <pre id="json-viewer-<?php echo $state ?>" class="json-viewer mb-0 <?php echo $state ?> rounded-2 mt-2" data-bs-custom-class="custom-popover" data-bs-toggle="popover" data-bs-placement="top" data-bs-content="Job data copied to clipboard" data-json="<?php echo htmlspecialchars($job['data']) ?>" style="min-height: 500px;max-height: 500px;overflow-y: scroll;font-size: 12px!important">
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
            <?php else: ?>
                <!-- <i>empty</i> -->
                <div class="row">
                    <div class="col text-center">
                        <img src="assets/empty.svg" class="img-fluid pt-1 opacity-25" alt="Empty" width="200">
                        <h6 class="text-body-tertiary m-0">Empty</h6>
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
