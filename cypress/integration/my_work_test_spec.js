import Workspace from '../support/elements/Workspace'
import RightNav from '../support/elements/RightNav'
import Canvas from '../support/elements/Canvas'

const workspace = new Workspace();
const rightNav = new RightNav();
const canvas = new Canvas();

describe('Test right nav tabs', function(){

    //This assumes there were canvases previously created from the left nav tabs
    it('will setup for tests', function(){
        workspace.openAndPublishCanvases();
    });
    describe('My Work tab tests', function(){
        it('verify that opened content is listed in My Work tab space', function(){ //still need to verify the titles match the titles from opened canvases
            cy.wait(1000);
            rightNav.openMyWorkTab();
            rightNav.getAllMyWorkAreaCanvasItems().each(($item,index,$list)=>{
                cy.log('Title is ' + $item.text());
            });
            rightNav.closeMyWorkTab();
        });
        it('will open the correct canvas selected from the My Work list', function(){
            rightNav.openMyWorkTab();
            rightNav.getAllMyWorkAreaCanvasItems().each(($item,index,$list)=>{
                let title= $item.text().replace(/[^\x00-\x7F]/g, "");
                cy.wrap($item).click();
                canvas.getCanvasTitle()
                    .then(($canvasTitle)=>{
                        let canvasTitle=$canvasTitle.text();
                        expect($canvasTitle.text()).to.contain(title);
                    });
                rightNav.openMyWorkTab();
                cy.wait(1000);
            });
            rightNav.closeMyWorkTab(); // clean up
        });

        it('will verify that My Work canvas has a tool palette', function(){
            rightNav.openMyWorkTab();
            rightNav.openMyWorkAreaCanvasItem('Introduction');
            canvas.getToolPalette().should('be.visible');
        })
    });
});
