import Workspace from '../support/elements/Workspace'
import RightNav from '../support/elements/RightNav'
import Canvas from '../support/elements/Canvas'

let workspace = new Workspace(),
    rightNav = new RightNav(),
    canvas = new Canvas();

context('Class Log tab tests', function(){
    describe('setup groups', function(){

    });
    describe('create and publish learning logs as teacher', function(){

    });
    describe('create and publish learning logs as students', function(){

    });
    describe('Class Log tab tests', function(){
        //TODO Currently commented out until Class Log is setup

        // it('will open correct canvas from Class Log list', function(){ //this assumes there are learning log published work
        //     rightNav.openClassLogTab();
        //     rightNav.getClassLogAreaCanvasItem().each(($item,index,$list)=>{
        //         let title= $item.text().replace(/[^\x00-\x7F]/g, "")//.split('Group'),
        //         // group = title[1];
        //         //  expect(($item).text()).to.contain(group);
        //         cy.wrap($item).click();
        //         canvas.getRightSideWorkspaceTitle() //This assumes that Class Log always opens in 2-up right workspace
        //             .then(($canvasTitle)=>{
        //                 let canvasTitle=$canvasTitle.text();
        //                 expect($canvasTitle.text()).to.contain(title[0]);
        //             });
        //         cy.wait(1000);
        //     });
        //     rightNav.closeClassLogTab(); //clean up
        // });
        //
        // it('will verify that Class Work canvas does not have a tool palette', function(){
        //     rightNav.openClassLogTab();
        //     rightNav.getClassLogAreaCanvasItem().first().click();
        //     canvas.getToolPalette().should('not.be.visible');
        // })
    })
});