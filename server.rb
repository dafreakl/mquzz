#!/usr/bin/env ruby
require 'sinatra'
require 'rack/utils'
require './models/quote'
require 'mongoid'
require 'amatch'
include Amatch

Mongoid.load!("config/mongoid.yml")

get '/api/quotes' do
  content_type :json
  quotes = Quote.all().fields(["number", "qdate", "solutions", "commits", "audiourl", "addinfo"]).desc(:number)
  quotes.to_json()
end

get '/api/quote/:year/:month/:day' do 
  puts "intern 1"
  content_type :json

  dat = "#{params[:day]}-#{params[:month]}-#{params[:year]}"
  quote = Quote.where(qdate: dat).fields(["number", "qdate", "solutions", "commits", "audiourl", "addinfo"])
  quote.to_json(:except => [:titles])
end

get '/api/quote/:nr' do |nr|
  content_type :json
  quote = Quote.where(number: nr).fields(["number", "qdate", "solutions", "commits", "audiourl", "addinfo"])
  quote.to_json(:except => [:titles])
end

post '/api/quote/:nr/evaluate' do |nr|
  result = []
  
  posted_solution = params[:psolution]
  solution = escape_html( posted_solution )  
  solution = '-' if solution == ''
  
  quotes = Quote.where(number: nr.to_i).entries
  return result.to_json if quotes.nil? || quotes.length <= 0
  
  quote = quotes.first

  quote.inc(:commits, 1)
  
  if quote.titles.index{|title| title.similar?(solution) }.nil?
    #wrong
    result.push(Hash["res" => false, "posted" => solution, "quote" => quote])
  else
    # correct 
    quote.inc(:solutions, 1) #quote.solutions += 1
    result.push(Hash["res" => true, "posted" => solution, "quote" => quote])
  end  
  
  result.to_json
end

get '/*' do
  @quotes = Quote.all().fields(["number", "qdate", "solutions", "commits", "audiourl", "addinfo"]).desc(:number)
  haml :index
end

class String
  def similar?(astr)
    #normalize
    ns = self.strip.downcase.delete " -"
    na = astr.strip.downcase.delete " -"
    
    #define max distance
    max_dist = case ns.length
      when 0..4 then 0
      when 5..9 then 2
      when 10..14 then 4
      when 15..19 then 6
      else 8
    end
    
    m = Levenshtein.new(ns)
    m.match(na) <= max_dist
  end  
end