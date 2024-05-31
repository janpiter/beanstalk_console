<?php
$fields = $console->getTubeStatFields();
$visible = $console->getTubeStatVisible();
?>
<section id="summaryTable">
    <div class="row">
        <div class="col-md-12 col-12 mt-4">
            <div class="card bg-body border-0 shadow-sm  rounded-top-2 rounded-bottom-0">
                <div class="card-body">
                    <div class="table-responsive mb-2">
                        <table class="table table-striped border-dark-subtle align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>Tube Name</th>
                                    <?php
                                    foreach ($fields as $key => $item) {
                                        $markHidden = !in_array($key, $visible) ? ' class="d-none"' : '';
                                        if (in_array($key, array('current-jobs-buried', 'current-jobs-delayed', 'current-jobs-ready'))) {
                                            ?>
                                            <th<?php echo $markHidden ?>  name="<?php echo $key ?>" title="<?php echo $item ?>"><a class="a-unstyled" href="#" onclick="document.getElementById('<?php echo $key; ?>').scrollIntoView(true);return false;"><?php echo ucfirst(str_replace('-', ' ', $key)) ?><b class="caret"></b></a></th>
                                                <?php } else { ?>
                                            <th<?php echo $markHidden ?>  name="<?php echo $key ?>" title="<?php echo $item ?>">
                                                <?php echo ucfirst(str_replace('-', ' ', $key)) ?>        
                                            </th>
                                            <?php
                                        }
                                    }
                                    ?>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach (array($tube) as $tubeItem): ?>
                                    <?php $tubeStats = $console->getTubeStatValues($tubeItem) ?>
                                    <tr class="<?php echo ($tubeStats['pause-time-left'] > '0')? 'tr-tube-paused': ''; ?>"
                                        title="<?php echo ($tubeStats['pause-time-left'] > '0')? 'Pause seconds left: ' . $tubeStats['pause-time-left'] : ''; ?>"
                                        >
                                        <td id="<?php echo 'tube-' . $tubeItem ?>"><?php echo $tubeItem ?></td>
                                        <?php
                                        foreach ($fields as $key => $item):
                                            $classes = array("td-$key");
                                            if (!in_array($key, $visible)) {
                                                $classes[] = 'd-none' ;
                                            }
                                            if (isset($tubeStats[$key]) && $tubeStats[$key] != '0') {
                                                $classes[] = 'hasValue';
                                            }
                                            $cssClass = '' ;
                                            if (count($classes) > 0) {
                                                $cssClass = ' class = "' . join(' ', $classes) . '"' ;
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