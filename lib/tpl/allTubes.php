<?php
$fields = $console->getTubeStatFields();
$groups = $console->getTubeStatGroups();
$visible = $console->getTubeStatVisible();
$fields = is_array($fields) ? $fields : array();
$visible = is_array($visible) ? $visible : array();
$tubeList = isset($tubes) && is_array($tubes) ? $tubes : array();
$tubeStatsByName = isset($tplVars['tubesStats']) && is_array($tplVars['tubesStats']) ? $tplVars['tubesStats'] : array();
?>

<section id="summaryTable">
    <div class="row">
        <div class="col-md-12 col-12 mt-4">
            <div class="card bg-body border-0 shadow-sm">
                <div class="card-body">
                    <div id="tubeBulkActions" class="tube-bulk-actions d-none" aria-live="polite">
                        <div class="tube-bulk-info">
                            <strong id="tubeSelectionSummary">0 tubes selected</strong>
                        </div>
                        <div class="tube-bulk-controls">
                            <div class="tube-bulk-action-group" role="group" aria-label="Kick buried jobs">
                                <button type="button" class="btn btn-default btn-sm bg-black bg-opacity-50" id="kickOneSelectedTubes" title="Kick one buried job from each selected tube" disabled>
                                    <i class="ri-speed-mini-fill" aria-hidden="true"></i> Kick 1 job
                                </button>
                                <div class="input-group input-group-sm tube-kick-more">
                                    <button type="button" class="btn btn-default bg-black bg-opacity-50 btn-sm" id="kickMoreSelectedTubes" title="Kick this many buried jobs from each selected tube" disabled>
                                        <i class="ri-forward-end-mini-fill" aria-hidden="true"></i> Kick more
                                    </button>
                                    <input type="number" min="1" step="1" value="10" class="form-control form-control-sm border border-black bg-black bg-opacity-25 border-opacity-50" id="kickSelectedCount" aria-label="Number of jobs to kick per tube">
                                </div>
                                <button type="button" class="btn btn-default btn-sm bg-black bg-opacity-50" id="kickAllSelectedTubes" title="Kick all buried jobs from each selected tube" disabled>
                                    <i class="ri-speed-mini-fill" aria-hidden="true"></i> Kick all jobs
                                </button>
                            </div>
                            <div class="tube-bulk-action-group tube-bulk-pause-group" role="group" aria-label="Pause controls">
                                <button type="button" class="btn btn-default btn-sm bg-black bg-opacity-50" id="pauseSelectedTubes" title="Temporarily pause job reservations on selected tubes" disabled>
                                    <i class="ri-pause-mini-fill" aria-hidden="true"></i> Pause selected
                                </button>
                                <button type="button" class="btn btn-default btn-sm bg-black bg-opacity-50" id="resumeSelectedTubes" title="Resume job reservations on selected tubes" disabled>
                                    <i class="ri-play-mini-fill" aria-hidden="true"></i> Resume selected
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="table-responsive mb-0">
                        <table class="table table-striped border-dark-subtle align-middle mb-0">
                            <thead class="">
                                <tr>
                                    <th scope="col" class="tube-select-column">
                                        <input type="checkbox" class="form-check-input" id="selectVisibleTubes" aria-label="Select all visible tubes" title="Select all visible tubes">
                                    </th>
                                    <th scope="col" class="">Tube Name</th>
                                    <?php
                                    foreach ($fields as $key => $item):
                                        $markHidden = !in_array($key, $visible) ? ' class="d-none"' : '';
                                        ?>
                                        <th<?php echo $markHidden ?>  name="<?php echo $key ?>" title="<?php echo $item ?>" scope="col" class=""><?php echo ucfirst(str_replace('-', ' ', $key)) ?></th>
                                    <?php endforeach; ?>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($tubeList as $tubeItem): ?>
                                    <?php
                                    $arr_tubeStats = isset($tubeStatsByName[$tubeItem]) && is_array($tubeStatsByName[$tubeItem])
                                        ? $tubeStatsByName[$tubeItem]
                                        : array();
                                    $tubeStats = array();
                                    foreach ($arr_tubeStats as $key => $arr) {
                                        if (is_array($arr) && array_key_exists('value', $arr)) {
                                            $tubeStats[$key] = $arr['value'];
                                        }
                                    }
                                    $pauseTimeLeft = isset($tubeStats['pause-time-left']) ? (int) $tubeStats['pause-time-left'] : 0;
                                    ?>
                                    <tr class="<?php echo ($pauseTimeLeft > 0) ? 'tr-tube-paused' : ''; ?>"
                                        title="<?php echo ($pauseTimeLeft > 0) ? 'Pause seconds left: ' . $pauseTimeLeft : ''; ?>"
                                        >
                                        <td class="tube-select-column">
                                            <input type="checkbox" class="form-check-input tube-row-select" value="<?php echo htmlspecialchars($tubeItem, ENT_QUOTES, 'UTF-8') ?>" aria-label="Select tube <?php echo htmlspecialchars($tubeItem, ENT_QUOTES, 'UTF-8') ?>">
                                        </td>
                                        <td scope="row" class="tube-name-cell" id="<?php echo 'tube-' . htmlspecialchars($tubeItem) ?>">
                                            <div class="tube-name-content">
                                                <a href="./?server=<?php echo urlencode($server) ?>&tube=<?php echo urlencode($tubeItem) ?>" class="text-info-emphasis link-underline link-underline-opacity-0 link-underline-opacity-75-hover">
                                                    <?php echo htmlspecialchars($tubeItem) ?>
                                                </a>
                                                <?php if ($pauseTimeLeft > 0): ?>
                                                    <span class="tube-paused-indicator" role="img" aria-label="Paused, <?php echo $pauseTimeLeft ?> seconds remaining" title="Paused · <?php echo $pauseTimeLeft ?> seconds remaining">
                                                        <i class="ri-pause-mini-fill" aria-hidden="true"></i>
                                                    </span>
                                                <?php endif; ?>
                                            </div>
                                        </td>
                                        <?php
                                        foreach ($fields as $key => $item):
                                            $classes = array("td-$key");
                                            if (!in_array($key, $visible)) {
                                                $classes[] = 'd-none';
                                            }
                                            if (isset($tubeStats[$key]) && $tubeStats[$key] != '0') {
                                                $classes[] = 'hasValue';
                                            }
                                            $cssClass = '';
                                            if (count($classes) > 0) {
                                                $cssClass = ' class = "' . join(' ', $classes) . '"';
                                            }
                                            ?>
                                            <td<?php echo $cssClass ?>><?php echo isset($tubeStats[$key]) ? $tubeStats[$key] : '' ?></td>
                                        <?php endforeach; ?>
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

