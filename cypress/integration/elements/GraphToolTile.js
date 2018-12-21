const graphUnit=18.3;

class GraphToolTile{
    transformCoordinate(axis, num){
        if (axis=='x'){
            return (num+1)*18.3;
        }
        if (axis=='y'){
            return 320-((num+1.2)*18.3);
        }
    }

    getBottomNavExpandedSpace(){
        return cy.get('.bottom-nav.expanded');
    }

    getGraphTile(){
        return cy.get('.canvas-area > .canvas > .document-content > .tile-row >  .tool-tile > .geometry-size-me > .geometry-tool');
    }

    getGraphPointText(){
        return cy.get('.geometry-tool.editable > .JXGinfobox');
    }

    getGraphPoint(){
        return cy.get('.geometry-tool.editable > svg > g > ellipse');
    }

    selectGraphPoint(x,y){
        let transX=this.transformCoordinate('x', x),
            transY=this.transformCoordinate('y', y);

        this.getGraphTile().last().click(transX,transY, {force:true});
    }

    getGraphPointID(){
         cy.get('.geometry-tool.editable > svg > g > ellipse').last()
            .then(($el)=>{
                return $el.attr('id');
            });
    }
    getGraphPolygon(){
        return cy.get('.geometry-tool.editable > svg > g > polygon');
    }

    addPointToGraph(x,y){
        let transX=this.transformCoordinate('x', x),
            transY=this.transformCoordinate('y', y);

        this.getGraphTile().last().click(transX,transY, {force:true});
    }

    getRotateTool(){
        return cy.get('.rotate-polygon-icon.enabled');
    }

    getGraphToolMenuIcon(){
        return cy.get('.geometry-menu-button')
    }
    showAngle(){
        this.getGraphToolMenuIcon().click();

    }
    hideAngle(){

    }

}
export default GraphToolTile;