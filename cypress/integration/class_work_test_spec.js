import Workspace from '../support/elements/Workspace'
import RightNav from '../support/elements/RightNav'
import Canvas from '../support/elements/Canvas'

let workspace = new Workspace(),
    rightNav = new RightNav(),
    canvas = new Canvas();

describe('Class Work tab tests', function(){

    it('will open correct canvas from Class Work list', function(){ //this assumes there are published work
        rightNav.openClassWorkTab();
        rightNav.openClassWorkSections();
        rightNav.getClassWorkAreaCanvasItem().each(($item,index,$list)=>{
            let title= $item.text().replace(/[^\x00-\x7F]/g, "")//.split('Group'),
            // group = title[1];
            //  expect(($item).text()).to.contain(group);
            cy.wrap($item).click();
            canvas.getRightSideWorkspaceTitle() //This assumes that Class Work always opens in 2-up right workspace
                .then(($canvasTitle)=>{
                    let canvasTitle=$canvasTitle.text();
                    expect($canvasTitle.text()).to.contain(title[0]);
                });
            cy.wait(1000);
        });
        rightNav.closeClassWorkTab(); //clean up
    });

    it('will verify that Class Work canvas does not have a tool palette', function(){
        rightNav.openClassWorkTab();
        rightNav.getClassWorkAreaCanvasItem().first().click();
        canvas.getToolPalette().should('not.be.visible');
    })
})