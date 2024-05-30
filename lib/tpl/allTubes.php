<?php
$fields = $console->getTubeStatFields();
$groups = $console->getTubeStatGroups();
$visible = $console->getTubeStatVisible();
?>

<section id="summaryTable">
    <div class="row pb-5 mb-5">
        <div class="col-md-12 col-12 mt-4">
            <div class="card bg-body border-0 shadow-sm">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped table-dark table-borderless align-middle mb-0">
                            <thead class="">
                                <tr>
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
                                <?php foreach ((is_array($tubes) ? $tubes : array()) as $tubeItem): ?>
                                    <?php
                                    $arr_tubeStats = $tplVars['tubesStats'][$tubeItem];
                                    $tubeStats = array();
                                    foreach ($arr_tubeStats as $key => $arr) {
                                        $tubeStats[$key] = $arr['value'];
                                    }
                                    ?>
                                    <tr class="<?php echo ($tubeStats['pause-time-left'] > '0') ? 'tr-tube-paused' : ''; ?>"
                                        title="<?php echo ($tubeStats['pause-time-left'] > '0') ? 'Pause seconds left: ' . $tubeStats['pause-time-left'] : ''; ?>"
                                        >
                                        <td scope="row" id="<?php echo 'tube-' . htmlspecialchars($tubeItem) ?>">
                                            <a href="./?server=<?php echo urlencode($server) ?>&tube=<?php echo urlencode($tubeItem) ?>" class="text-info-emphasis link-underline link-underline-opacity-0 link-underline-opacity-75-hover">
                                            <?php echo htmlspecialchars($tubeItem) ?>
                                            </a>
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
