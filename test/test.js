'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');

const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const { BlogPost } = require('../models');
const { runServer, app, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

//////////////////////////////////////////////////////////////////////////////////

function seedBlogData(){
    console.info('seeding blog data');
    const seedData = [];

    for(let i =1; i <= 10; i++){
        seedData.push(generateBlogData());
    }
    return BlogPost.insertMany(seedData);
};

/////////////////////////////////////////////////////////////////////////////////

function generateBlogData(){
    return {
        title: faker.lorem.words(),
        content: faker.lorem.paragraph(),
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        }
    };
};

/////////////////////////////////////////////////////////////////////////////////

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

/////////////////////////////////////////////////////////////////////////////////

describe('BlogPosts API resource', function() {

      before(function() {
        return runServer(TEST_DATABASE_URL);
      });
    
      beforeEach(function() {
        return seedBlogData();
      });
    
      afterEach(function() {
        return tearDownDb();
      });
    
      after(function() {
        return closeServer();
    })

    describe('GET ENDPOINT', function(){
        it('should return all existing blog posts', function() {
            let res;
            return chai.request(app)
                .get('/posts')
                .then(function(res){
                    res.should.have.status(200);
                    res.body.should.have.lengthOf.at.least(1);
                    return BlogPost
                        .count()
                        .then(function(count){
                            res.body.should.have.lengthOf(count);
                        })
                });
        });

        it('should return blogs with right fields', function() {
            // Strategy: Get back all restaurants, and ensure they have expected keys
      
            let resBlogPost;
            return chai.request(app)
              .get('/posts')
              .then(function(res) {
                // console.log(res.body);
                res.should.have.status(200);
                res.should.be.json;
                res.body.should.be.a('array');
                res.body.should.have.lengthOf.at.least(1);
      
                res.body.forEach(function(blogpost) {
                  blogpost.should.be.a('object');
                  blogpost.should.include.keys(
                    'id', 'title', 'content', 'author', 'created');
                });
                resBlogPost = res.body[0];
                return BlogPost.findById(resBlogPost.id);
              })
              .then(function(blogpost) {
      
                // console.log(typeof resBlogPost.created);
                // console.log(typeof blogpost.created);

                let resBlogPostDate = new Date(resBlogPost.created);
                
                resBlogPost.id.should.equal(blogpost.id);
                resBlogPost.title.should.equal(blogpost.title);
                resBlogPost.content.should.equal(blogpost.content);
                resBlogPost.author.should.equal(`${blogpost.author.firstName} ${blogpost.author.lastName}`);
                resBlogPostDate.toUTCString().should.equal(blogpost.created.toUTCString());

            });
        });
    });

    describe('POST endpoint', function() {

        it('should add a new blogPost', function() {
    
          const newBlogPost = generateBlogData();
    
          return chai.request(app)
            .post('/posts')
            .send(newBlogPost)
            .then(function(res) {
              res.should.have.status(201);
              res.should.be.json;
              res.body.should.be.a('object');
              res.body.should.include.keys(
                'id', 'title', 'content', 'author', 'created');
              res.body.title.should.equal(newBlogPost.title);
              // cause Mongo should have created id on insertion
              res.body.id.should.not.be.null;
              res.body.content.should.equal(newBlogPost.content);
              res.body.author.should.equal(`${newBlogPost.author.firstName} ${newBlogPost.author.lastName}`);
                
              return BlogPost.findById(res.body.id);
            })
            .then(function(blogpost) {
 
            let blogPostAuthor = `${blogpost.author.firstName} ${blogpost.author.lastName}`;

              blogpost.title.should.equal(newBlogPost.title);
              blogpost.content.should.equal(newBlogPost.content);
              console.log(`${newBlogPost.author.firstName} ${newBlogPost.author.lastName}`);
              console.log(blogpost.author);
              blogPostAuthor.should.equal(`${newBlogPost.author.firstName} ${newBlogPost.author.lastName}`);

            });
        });
      });

    describe('PUT endpoint', function() {
        
        it('should update fields you send over', function() {
            const updateData = {
                title: 'fofofofofofofof',
                content: 'futuristic fusion'
            };
        
            return BlogPost
                .findOne()
                .then(function(blogpost) {
                  updateData.id = blogpost.id;
        
                  return chai.request(app)
                    .put(`/posts/${blogpost.id}`)
                    .send(updateData);
                })
                .then(function(res) {
                  res.should.have.status(204);
        
                  return BlogPost.findById(updateData.id);
                })
                .then(function(blogpost) {
                  blogpost.title.should.equal(updateData.title);
                  blogpost.content.should.equal(updateData.content);
                });
              });
          });

    describe('DELETE endpoint', function() {

        it('delete a blogpost by id', function() {
        
            let blogpost;
        
            return BlogPost
                .findOne()
                .then(function(_blogpost) {
                  blogpost = _blogpost;
                  return chai.request(app).delete(`/posts/${blogpost.id}`);
                })
                .then(function(res) {
                  res.should.have.status(204);
                  return BlogPost.findById(blogpost.id);
                })
                .then(function(_blogpost) {
                  should.not.exist(_blogpost);
                });
        });
    });
});



