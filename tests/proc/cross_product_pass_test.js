/**
 * @license
 * Copyright 2014 The Lovefield Project Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
goog.setTestOnly();
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.op');
goog.require('lf.proc.CrossProductNode');
goog.require('lf.proc.CrossProductPass');
goog.require('lf.proc.SelectNode');
goog.require('lf.proc.TableAccessNode');
goog.require('lf.schema.DataStoreType');
goog.require('lf.tree');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'CrossProductPassTest');


/** @type {!lf.schema.Database} */
var schema;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(function(db) {
    schema = db.getSchema();
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests a complex tree, where a CrossProductNode with many children exists.
 */
function testTree() {
  var d = schema.getDepartment();
  var e = schema.getEmployee();
  var j = schema.getJob();

  var treeBefore =
      'select(combined_pred_and)\n' +
      '-cross_product\n' +
      '--table_access(Employee)\n' +
      '--table_access(Job)\n' +
      '--table_access(Location)\n' +
      '--table_access(JobHistory)\n' +
      '--table_access(Department)\n';

  var treeAfter =
      'select(combined_pred_and)\n' +
      '-cross_product\n' +
      '--cross_product\n' +
      '---cross_product\n' +
      '----cross_product\n' +
      '-----table_access(Employee)\n' +
      '-----table_access(Job)\n' +
      '----table_access(Location)\n' +
      '---table_access(JobHistory)\n' +
      '--table_access(Department)\n';

  var crossProductNode = new lf.proc.CrossProductNode();
  crossProductNode.addChild(new lf.proc.TableAccessNode(e));
  crossProductNode.addChild(new lf.proc.TableAccessNode(j));
  crossProductNode.addChild(new lf.proc.TableAccessNode(schema.getLocation()));
  crossProductNode.addChild(
      new lf.proc.TableAccessNode(schema.getJobHistory()));
  crossProductNode.addChild(new lf.proc.TableAccessNode(d));

  var rootNodeBefore = new lf.proc.SelectNode(
      lf.op.and(e.jobId.eq(j.id), e.departmentId.eq(d.id)));
  rootNodeBefore.addChild(crossProductNode);
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.CrossProductPass();
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
}
