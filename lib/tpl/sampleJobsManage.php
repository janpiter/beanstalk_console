<?php
$sampleJobs = $console->getSampleJobs();
if (!empty($sampleJobs)) {
    $_servers = $console->getServers();
    if (count($_servers) == 1) {
        $_server = current($_servers);
    }
    if (isset($_SESSION['info'])) {
        ?>
        <div class="alert alert-info" id="sampleSaveAlert">
            <span><?php echo $_SESSION['info']; ?></span>
        </div>
        <script>
            window.setTimeout(function () {
                $(".alert").alert('close');
            }, 2000);
        </script>
        <?php
        unset($_SESSION['info']);
    }
    ?>    
    <div class="row">
        <div class="col text-end mt-3">
            <a href="./?action=newSample" class="btn btn-success btn-sm">
                <i class="ri-add-line"></i> Add job to samples
            </a>
        </div>
    </div>
    <section id="summaryTable">
        <div class="row">
            <div class="col-md-12 col-12 mt-2">
                <div class="card bg-body border-0 shadow-sm">
                    <div class="card-body">
                        <div class="table-responsive" style="min-height: 220px">
                            <table class="table table-striped border-dark-subtle align-middle mb-0">
                                <thead>
                                <tr>
                                    <th scope="col" class="col-9">Name</th>
                                    <th scope="col">Kick job to tubes</th>
                                    <th scope="col">Action</th>
                                </tr>
                                </thead>
                                <tbody>
                                <?php foreach ($sampleJobs as $key => $job): ?>
                                    <tr>
                                        <td name="<?php echo $key ?>">
                                            <a class="text-info-emphasis link-underline link-underline-opacity-0 link-underline-opacity-75-hover"
                                            href="./?action=editSample&key=<?php echo $key ?>"><?php echo htmlspecialchars($job['name']); ?></a>
                                        </td>
                                        <td class="">
                                            <?php
                                            if (is_array($job['tubes'])) {
                                                foreach ($job['tubes'] as $tubename => $val) {
                                                    if (isset($_server) && !empty($_server)) {
                                                        ?>
                                                        <a class="btn btn-success btn-sm"
                                                           href="./?server=<?php echo $_server ?>&tube=<?php echo urlencode($tubename) ?>&action=loadSample&key=<?php echo $key; ?>&redirect=<?php echo urlencode('./?action=manageSamples'); ?>"><i
                                                                    class="glyphicon glyphicon-forward"></i> <?php echo $tubename; ?></a>
                                                    <?php
                                                    } else {
                                                        ?>
                                                        <div class="btn-group">
                                                            <a class="btn btn-default bg-black bg-opacity-50 btn-sm" href="#" data-toggle="dropdown"><i class="glyphicon glyphicon-forward"></i> <?php echo $tubename; ?></a>
                                                            <button class="btn btn-default bg-black bg-opacity-50 btn-sm dropdown-toggle" data-bs-toggle="dropdown">
                                                                <span class="caret"></span>
                                                            </button>
                                                            <ul class="dropdown-menu dropdown-menu-end">
                                                                <?php
                                                                if (is_array($_servers)) {
                                                                    foreach ($_servers as $server2) {
                                                                        ?>
                                                                        <li>
                                                                            <a class="dropdown-item" href="./?server=<?php echo $server2 ?>&tube=<?php echo urlencode($tubename) ?>&action=loadSample&key=<?php echo $key; ?>&redirect=<?php echo urlencode('./?action=manageSamples'); ?>"><?php echo $server2; ?></a>
                                                                        </li>
                                                                    <?php
                                                                    }
                                                                }
                                                                ?>
                                                            </ul>
                                                        </div>
                                                    <?php
                                                    }
                                                }
                                            }
                                            ?>
                                        </td>
                                        <td class="">
                                            <a class="btn btn-default bg-black bg-opacity-50 btn-sm" href="./?action=editSample&key=<?php echo $key ?>">
                                                <i class="ri-pencil-fill"></i> Edit
                                            </a>
                                            <a class="btn btn-sm btn-danger border-0" href="./?action=deleteSample&key=<?php echo $key ?>">
                                                <i class="ri-delete-bin-line"></i> Delete
                                            </a>
                                        </td>
                                    </tr>
                                <?php endforeach ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
<?php } else { ?>
    <div class="row">
        <div class="col-md-12 col-12 mt-4">
            <div class="card bg-body border-0 shadow-sm">
                <div class="card-body text-center my-5">
                    <img src="assets/empty.svg" class="img-fluid opacity-25" alt="Empty" width="240">
                    <p class="mb-0">There are no saved jobs</p>
                </div>
            </div>
        </div>
    </div>
<?php } ?>
