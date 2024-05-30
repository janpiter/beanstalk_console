<?php
$searchResults = $console->getSearchResult();
include('currentTubeJobsSummaryTable.php');
?>
<section id="actionsRow">
    <div class="row">
        <div class="col-md-12 col-12">
            <div class="card bg-body border-0 rounded-bottom-2 rounded-top-0 shadow-sm">
                <div class="card-body pt-0">
                    <a class="btn btn-info btn-sm" href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>"><i class="ri-arrow-left-line"></i> Back to tube</a>
                </div>
            </div>
        </div>
    </div>
</section>
<?php
if ($searchResults['total'] > 0) {
    unset($searchResults['total']);
    ?>
    <section id="searchResult">
        <div class="row">
            <div class="col-md-12 col-12 mt-4">
                <div class="card bg-body border-0 shadow-sm">
                    <div class="card-body">
                        <div class="table-responsive" style="min-height: 240px">
                            <table class="table table-striped table-dark table-borderless align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th scope="col" class="col-2">ID</th>
                                        <th scope="col" class="col-2">State</th>
                                        <th scope="col" class="col-6">Data</th>
                                        <th scope="col" class="col-1 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($searchResults as $state => $jobList): ?>
                                        <?php foreach ($jobList as $job): ?>
                                            <tr>
                                                <td><?php echo $job->getId(); ?></td>
                                                <td><?php echo $state; ?></td>
                                                <td class="ellipsize">
                                                    <p class="text-wrap m-0"><?php echo htmlspecialchars($job->getData()); ?></p>
                                                </td>
                                                <td class="text-center">
                                                    <div class="dropdown">
                                                        <button class="btn btn-info btn-sm dropdown-toggle" type="button" id="dropdownMenu1" data-bs-toggle="dropdown" aria-expanded="true">
                                                            Actions
                                                            <span class="caret"></span>
                                                        </button>
                                                        <ul class="dropdown-menu" aria-labelledby="dropdownMenu1">
                                                            <li role="presentation"><a role="menuitem" class="addSample dropdown-item" data-jobid="<?php echo $job->getId(); ?>"
                                                                                       href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&action=addSample">
                                                                    <i class="glyphicon glyphicon-plus glyphicon-white"></i>
                                                                    Add to samples</a>
                                                            </li>
                                                            <li role="presentation"><a role="menuitem"
                                                                                       href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&state=<?php echo $state ?>&action=deleteJob&jobid=<?php echo $job->getId(); ?>" class="dropdown-item"><i
                                                                        class="glyphicon glyphicon-remove glyphicon-white"></i>
                                                                    Delete</a>
                                                            </li>
                                                            <li role="presentation"><a class="dropdown-item" role="menuitem"
                                                                                       href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tube) ?>&state=<?php echo $state ?>&action=kickJob&jobid=<?php echo $job->getId(); ?>"><i
                                                                        class="glyphicon glyphicon-forward glyphicon-white"></i>
                                                                    Kick</a>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </td>
                                            </tr>
                                        <?php endforeach ?>
                                    <?php endforeach ?>
                                </tbody>
                            </table>
                        </div>
                        <p class="mb-0 mt-2">First <?php echo intval($_GET['limit']); ?> rows are displayed for each state.</p>
                    </div>
                </div>
            </div>
        </div>
        <br/>
        <br/>
    </section>

    <?php
} else {
    ?>
    <br/>
    No results found for <b><?php echo htmlspecialchars($_GET['searchStr']); ?></b> in tube: <b><?php echo $tube; ?></b>
    <?php
}
